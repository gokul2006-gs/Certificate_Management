# Spring Boot API

Java 21 API for the certificate management React application. This directory is a Maven project; the backend does not use Node.js, Express, or Mongoose.

## Local development

1. Copy `.env.example` to `.env` and configure MongoDB and secrets.
2. Start MongoDB.
3. Run `mvn spring-boot:run`; the API listens on `http://localhost:8080`.
4. Verify with `GET /api/health`.

The first administrator is provisioned when `ADMIN_PASSWORD` is present and the configured username is not already in the `admins` collection. Existing Mongoose collections are retained by using their collection names (`students`, `admins`, `courses`, `certificates`, `adminloginlogs`, `certificateviews`, and `certificategenerationjobs`).

## Main endpoints

- `POST /api/auth/admin/login`, `POST /api/auth/student/login`, `GET /api/auth/session`, `POST /api/auth/logout`
- `GET|POST /api/students`, `GET|PUT|DELETE /api/students/{studentId}`, `POST /api/students/import`, `POST /api/students/bulk-delete`
- `GET|POST /api/courses`, `PUT|DELETE /api/courses/{id}`
- `GET /api/certificates`, `POST /api/certificates/upload`, `POST /api/certificates/bulk-upload`
- `POST /api/certificates/generation-jobs`, `GET /api/certificates/generation-jobs/{jobId}`, `POST /api/certificates/generation-jobs/{jobId}/cancel`
- `GET /api/certificates/view/{studentId}`, `GET /api/certificates/verify/{studentId}`, `GET /api/certificates/download/{studentId}`, `GET /api/certificates/download-all`
- `GET /api/admin/dashboard-stats`, `GET /api/admin/login-logs`, `GET /api/admin/database-status`

Pagination uses `page` and `pageSize`; search/filtering is performed in MongoDB. Files are stored under `UPLOAD_ROOT`; use a persistent volume for local storage in production. SMTP is optional and is enabled by setting `MAIL_FROM` and the `MAIL_*` variables.
