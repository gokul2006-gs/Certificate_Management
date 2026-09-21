# Smart Certificate Management and Verification System

A full-stack MERN-style web application for managing student records, certificate issuance, QR verification, and course data. The project uses a React frontend and a Node.js/Express backend with MongoDB storage.

---

## Project Overview

This system automates the complete certificate lifecycle:

- Student registration and login
- Course management
- Certificate upload and bulk generation
- QR code generation and verification
- Student dashboard and admin dashboard
- Certificate download and status tracking

---

## Features

### Admin Module

- Admin login
- Dashboard statistics
- Student management
- Course management
- Certificate upload
- Bulk certificate processing
- Template-based certificate generation
- QR verification setup

### Student Module

- Student login
- Dashboard overview
- Profile view
- Course details
- Certificate download
- Verification page access

### Certificate Verification

- QR code scanning
- Verification page
- Certificate validation
- Download access control

---

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Axios
- React Router
- Lucide React

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Helmet, CORS, rate limiting

### Storage / Media

- Local file storage or cloud storage adapters
- QR image generation

---

## Project Structure

```text
Certificate_Management/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── README.md
├── render.yaml
└── vercel.json
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/gokul2006-gs/Certificate_Management.git
cd Certificate_Management
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

---

## Environment

Set the required app variables in `backend/.env`, including database, JWT, storage, and frontend URL configuration before running the application.

---

## Notes

This repository no longer uses the legacy Python/Django implementation and has been migrated to the current Node.js + MongoDB stack.


```http
POST /api/accounts/login/

POST /api/accounts/upload-excel/

GET /api/accounts/students/

GET /api/accounts/profile/<student_id>/
```

### Certificates

```http
POST /api/certificates/upload/

POST /api/certificates/bulk-upload/

GET /api/certificates/view/<student_id>/

GET /api/certificates/verify/<student_id>/
```

---

## Workflow

```text
Admin Login
      ↓
Upload Excel File
      ↓
Students Created
      ↓
Upload Certificates
      ↓
QR Codes Generated
      ↓
Student Login
      ↓
Download Certificate
      ↓
Scan QR Code
      ↓
Certificate Verification
```

---

## Future Enhancements

* Email Certificate Delivery
* WhatsApp Integration
* Digital Signature Verification
* Certificate Expiry Tracking
* Docker Deployment
* Cloud Hosting
* Mobile Application

---

## Project Outcome

The system successfully automates certificate management, reduces manual effort, improves security through QR verification, and provides a scalable solution for internship and training certificate management.

---


