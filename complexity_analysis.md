# Technical Documentation - Time & Space Complexity Analysis

This document provides a detailed analysis of the algorithmic complexity (time and space) of the core backend workflows and database queries in the Certificate Management Portal.

---

## 1. Authentication Workflows

### Student Login
- **Endpoint**: `/api/accounts/login/` (Role: `student`)
- **Core Operations**:
  1. Lookup Student record by `student_id` in the database.
  2. Verify the hashed password.
- **Complexity**:
  - **Time Complexity**: 
    - **Database Lookup**: $\mathcal{O}(1)$ average case. The `student_id` field has a `unique=True` constraint, which automatically generates an index in MongoDB.
    - **Password Verification**: $\mathcal{O}(1)$ CPU-bound. Verification utilizes PBKDF2/bcrypt hashing algorithms. While mathematically $\mathcal{O}(1)$ (constant time), password hashing is intentionally computationally heavy to mitigate brute-force attacks (typically taking 100ms - 300ms of CPU time).
    - **Overall Time**: $\mathcal{O}(1)$ (dominated by the hashing verification).
  - **Space Complexity**: $\mathcal{O}(1)$ as only a single student object and session token are held in memory.

### Admin Login
- **Endpoint**: `/api/accounts/login/` (Role: `admin`)
- **Core Operations**:
  1. Authenticate standard Django user via `django.contrib.auth`.
  2. Write an `AdminLoginLog` entry.
- **Complexity**:
  - **Time Complexity**: $\mathcal{O}(1)$ database write. Hashing verification is $\mathcal{O}(1)$.
  - **Space Complexity**: $\mathcal{O}(1)$ constant memory allocation.

---

## 2. Certificate Queries and Verification

### View Dashboard / Verification Check
- **Endpoints**: `/api/certificates/view/<student_id>/` & `/api/certificates/verify/<student_id>/`
- **Core Operations**:
  1. Retrieve the latest certificate matching the `student_id`.
  2. Perform on-the-fly QR code generation if the QR code is missing in storage.
- **Complexity**:
  - **Time Complexity**:
    - **Database Query**: $\mathcal{O}(1)$. The lookup utilizes `student__student_id` filter. In Django, this runs a query joining the `Student` collection/table. Since `student_id` is indexed, the student query is $\mathcal{O}(1)$. Retrieving the certificate filtered by the student foreign key takes $\mathcal{O}(C)$ where $C$ is the count of certificates for that specific student. Since a student typically has $\le 2$ certificates, this is effectively $\mathcal{O}(1)$.
    - **QR Code Generation (Fallback)**: $\mathcal{O}(1)$. Creating a QR code for a static verification URL depends only on URL string length (constant) and the QR code version configuration.
    - **Overall Time**: $\mathcal{O}(1)$.
  - **Space Complexity**: $\mathcal{O}(1)$ auxiliary space.

---

## 3. Upload Workflows

### Single Certificate Upload
- **Endpoint**: `/api/certificates/upload/`
- **Core Operations**:
  1. Retrieve student profile ($O(1)$).
  2. Save the uploaded file to media storage (Disk/S3).
  3. Generate QR code image.
  4. Write the Certificate metadata to the database.
- **Complexity**:
  - **Time Complexity**: $\mathcal{O}(F)$ where $F$ is the byte size of the uploaded certificate file. Reading the upload stream and writing it to storage is bounded by network and Disk I/O throughput.
  - **Space Complexity**: $\mathcal{O}(F)$ memory buffer allocated during chunked upload parsing.

### Bulk Certificate Upload (ZIP)
- **Endpoint**: `/api/certificates/bulk-upload/`
- **Core Operations**:
  1. Extract files from an uploaded ZIP archive.
  2. Regex match filenames to identify Student IDs (e.g., `TSC001`).
  3. Batch query or sequentially lookup student records.
  4. Save certificate files and generate corresponding QR codes.
- **Complexity**:
  - **Time Complexity**: $\mathcal{O}(N \cdot \text{avg}(F_i))$ where $N$ is the number of files inside the ZIP archive, and $\text{avg}(F_i)$ is the average size of each file.
    - Filename regex parsing: $\mathcal{O}(N \cdot L)$ where $L$ is the average filename string length.
    - Database lookup: $\mathcal{O}(N)$ database queries (sequential queries, which could be optimized to a bulk query).
    - Image write / QR code generation: $\mathcal{O}(N)$ operations.
  - **Space Complexity**: $\mathcal{O}(\text{ZIP\_SIZE} + \text{max}(F_i))$. Python's `zipfile` module processes entries sequentially, keeping only the current file entry and the compressed archive structure in memory.

---

## 4. Batch Certificate Template Generation

The application allows admins to upload a blank PNG/JPG template and auto-render certificates for multiple students by overlaying their names, IDs, course details, and verification QR codes.

### Core Processing Loop
Rendering certificate images is a CPU-bound operation using the `Pillow` library:
1. Load the background template image into memory.
2. Search for the optimal font size using a binary-search-like loop (`_fit_font`) so that names do not overflow boundaries.
3. Draw wrapped text lines using Pillow's `ImageDraw`.
4. Generate the QR code and paste it onto the certificate coordinates.
5. Save the generated PNG to storage.

### Complexity Breakdown
- **Time Complexity**:
  - **Image Loading/Manipulation**: $\mathcal{O}(W \cdot H)$ where $W$ and $H$ are the pixel width and height of the template.
  - **Font Sizing & Text Fitting**: $\mathcal{O}(S \cdot K)$ where $S$ is the text character count, and $K$ is the number of font resizing steps (usually $\le 10$ steps).
  - **Pasting QR Code**: $\mathcal{O}(Q^2)$ where $Q$ is the size of the QR code (resized to $12\%$ of template dimensions, hence $\mathcal{O}(W \cdot H)$).
  - **Total per student**: $\mathcal{O}(W \cdot H + S \cdot K)$
  - **Total for $N$ students**: $\mathcal{O}(N \cdot (W \cdot H + S \cdot K))$
- **Space Complexity**:
  - **Memory Usage**: $\mathcal{O}(W \cdot H)$ bytes. For a high-resolution print template (e.g., $3000 \times 2000$ pixels at 3 channels), this requires approximately $18\text{ MB}$ of raw pixel data in memory during rendering.

### Performance & Scaling Optimization (Polling Architecture)
Because generating certificates is heavy, running this synchronously for $N > 50$ students in a single HTTP request would trigger gateway timeouts (e.g., Vercel's 10-second or Render's 30-second limits).

To scale this load, the application implements a **polling batch job model**:
- **Job Creation**: An admin initiates a generation job, creating a `CertificateGenerationJob` record with status `pending`.
- **Worker/Polling Loop**: The frontend repeatedly polls `/api/certificates/poll-generation-job/<job_id>/` in the background.
- **Batching**: Each poll request triggers the backend to process a small slice of students (`JOB_BATCH_SIZE = 3`).
- **Complexity impact**: The work is distributed over $N / 3$ requests. This reduces the duration of individual HTTP requests to $<500\text{ms}$ and prevents thread blockage, allowing the load balancer to route other lightweight traffic in between polls.

---

## 5. Architectural Scaling and Load Balancing

Under heavy traffic (e.g., during graduation certificate releases), the load profile shifts from read-heavy (students scanning QR codes) to CPU-heavy (certificate generation).

To ensure high availability, the following optimizations are implemented:
1. **Database Indexing**: MongoDB utilizes B-tree indexes. Ensuring indexed lookups on `student_id` reduces query time from $\mathcal{O}(N)$ (table scans) to $\mathcal{O}(\log N)$ (index searches).
2. **Horizontal Scaling**: Adding a reverse proxy load balancer (like Nginx) routes requests across multiple application instances (`web-1`, `web-2`) using a Round-Robin or Least-Connections algorithm.
3. **Process-Level Concurrency**: Gunicorn handles concurrency at the server node level by using a pre-fork worker pool (`--workers 3 --threads 2`). If a worker is blocked processing a file, other workers remain free to handle lightweight dashboard lookups.
