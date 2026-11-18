# Certificate Management

Certificate Management is a React application backed exclusively by a Java 21 Spring Boot REST API and MongoDB.

## Architecture

```text
React + Tailwind CSS → REST API → Java 21 / Spring Boot → MongoDB Atlas
```

The backend is in [`backend/`](./backend/). It uses Spring Security, stateless JWT session cookies, Spring Data MongoDB, Jakarta Bean Validation, and Maven. It provides student/admin authentication, student and course management, Excel imports, certificate uploads and PDF generation, QR verification, expiry alerts, email notifications, audit history, and paginated dashboard APIs.

## Run locally

Requirements: Java 21+, Maven 3.9+, MongoDB, and Node.js for the React frontend only.

1. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), and `ADMIN_PASSWORD`.
2. Start the API:

   ```powershell
   cd backend
   mvn spring-boot:run
   ```

3. In another terminal, install frontend dependencies and start Vite:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The API listens on port `8080`, the frontend on port `5173`, and the health check is `http://localhost:8080/api/health`. The initial administrator is created on first startup only when `ADMIN_PASSWORD` is configured.

## Backend checks

```powershell
cd backend
mvn test
mvn package
```

`backend/Dockerfile` builds and runs the Java API on Render. Set MongoDB Atlas, JWT, admin, cookie, storage, and optional SMTP variables in the deployment environment. See [`backend/.env.production.example`](./backend/.env.production.example) for the variable names.
