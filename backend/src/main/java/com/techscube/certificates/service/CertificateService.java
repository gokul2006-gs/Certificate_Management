package com.techscube.certificates.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.model.Certificate;
import com.techscube.certificates.model.CertificateView;
import com.techscube.certificates.model.Student;
import com.techscube.certificates.repository.CertificateRepository;
import com.techscube.certificates.repository.CertificateViewRepository;
import com.techscube.certificates.repository.StudentRepository;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CertificateService {
    private final CertificateRepository certificates;
    private final CertificateViewRepository views;
    private final StudentRepository students;
    private final MongoTemplate mongo;
    private final ApiMapper mapper;
    private final CertificateFileService files;
    private final EmailNotificationService notifications;
    private final ObjectMapper objectMapper;
    private final String frontendUrl;

    public CertificateService(
            CertificateRepository certificates,
            CertificateViewRepository views,
            StudentRepository students,
            MongoTemplate mongo,
            ApiMapper mapper,
            CertificateFileService files,
            EmailNotificationService notifications,
            ObjectMapper objectMapper,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.certificates = certificates;
        this.views = views;
        this.students = students;
        this.mongo = mongo;
        this.mapper = mapper;
        this.files = files;
        this.notifications = notifications;
        this.objectMapper = objectMapper;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public Map<String, Object> list(String search, String status, int page, int pageSize) {
        Query query = new Query();
        List<Criteria> filters = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            String escaped = java.util.regex.Pattern.quote(search.trim());
            filters.add(new Criteria().orOperator(Criteria.where("studentId").regex(escaped, "i"),
                    Criteria.where("courseName").regex(escaped, "i")));
        }
        if (status != null && !status.isBlank()) filters.add(Criteria.where("status").is(status.toUpperCase(Locale.ROOT)));
        if (!filters.isEmpty()) query.addCriteria(new Criteria().andOperator(filters));
        long total = mongo.count(query, Certificate.class);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt")).with(PageRequest.of(page - 1, pageSize));
        List<Map<String, Object>> items = mongo.find(query, Certificate.class).stream()
                .map(item -> mapper.certificate(item, "")).toList();
        return Map.of("items", items, "total", total, "page", page, "pageSize", pageSize,
                "totalPages", (int) Math.ceil((double) total / pageSize));
    }

    public Map<String, Object> upload(
            String studentId, MultipartFile file, String courseName, String issueDate, String endDate,
            String expiresAt, String rawFields)
            throws IOException {
        if (file == null || file.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Certificate file is required");
        String filename = Path.of(file.getOriginalFilename() == null ? "certificate.pdf" : file.getOriginalFilename())
                .getFileName().toString();
        String extension = extension(filename);
        if (!List.of("pdf", "png", "jpg", "jpeg").contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Allowed types: PDF, JPG, JPEG, PNG");
        }
        Student student = students.findByStudentIdIgnoreCase(studentId.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Student not found"));
        byte[] content = file.getBytes();
        validateFileSignature(content, extension);
        if (rawFields != null && !rawFields.isBlank() && List.of("png", "jpg", "jpeg").contains(extension)) {
            Map<String, Object> fields;
            try {
                fields = objectMapper.readValue(rawFields, new TypeReference<>() {});
            } catch (IOException exception) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Certificate fields must be valid JSON");
            }
            content = files.renderImage(content, student, courseName, dateRange(issueDate, endDate), fields);
            extension = "png";
        }
        return issue(student, content, extension, courseName, parseDate(issueDate), parseDate(expiresAt));
    }

    public Map<String, Object> issueGeneratedPdf(Student student, String courseName, Instant issueDate, Instant expiresAt) {
        try {
            return issue(student, files.generatePdf(student, courseName, issueDate), "pdf", courseName, issueDate, expiresAt);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Certificate PDF generation failed");
        }
    }

    public Map<String, Object> issueGeneratedPdfFromTemplate(
            Student student, String courseName, Instant issueDate, String issueDateLabel, Instant expiresAt,
            byte[] templateBytes, Map<String, Object> fields) {
        try {
            byte[] pdf = files.generateTemplatePdf(student, courseName, issueDate, issueDateLabel, templateBytes, fields);
            return issue(student, pdf, "pdf", courseName, issueDate, expiresAt);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not render the certificate template");
        }
    }

    private Map<String, Object> issue(
            Student student, byte[] bytes, String extension, String courseName, Instant issueDate, Instant expiresAt) throws IOException {
        CertificateFileService.StoredFile storedCertificate = files.saveCertificate(student.getStudentId(), extension, bytes);
        String token = files.verificationToken(student.getStudentId());
        byte[] qr = files.createQr(frontendUrl + "/verify/" + student.getStudentId() + "?token=" + token);
        CertificateFileService.StoredFile storedQr = files.saveQr(student.getStudentId(), qr);

        certificates.findFirstByStudentIdIgnoreCaseOrderByCreatedAtDesc(student.getStudentId()).ifPresent(previous -> {
            if ("VALID".equals(previous.getStatus())) {
                previous.setStatus("REVOKED");
                previous.setRevokedAt(Instant.now());
                previous.setRevokedReason("Superseded by a newer certificate");
                certificates.save(previous);
            }
        });
        Instant now = Instant.now();
        Certificate certificate = new Certificate(null, student.getId(), student.getStudentId(),
                storedCertificate.url(), storedCertificate.key(), storedQr.url(), storedQr.key(), token,
                courseName == null ? "" : courseName, issueDate == null ? now : issueDate, expiresAt,
                "VALID", null, "", null, now, now);
        Certificate saved = certificates.save(certificate);
        notifications.certificateIssued(student, saved);
        return mapper.certificate(saved, "");
    }

    public Map<String, Object> view(String studentId, String role, String callerStudentId, String ip, String userAgent) {
        Student student = students.findByStudentIdIgnoreCase(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found"));
        authorizeStudent(role, callerStudentId, student.getStudentId());
        Certificate certificate = latest(student.getStudentId()).orElse(null);
        if (certificate == null) {
            return Map.of("status", "PENDING", "student_id", student.getStudentId(),
                    "student_name", student.getName(), "certificate_available", false);
        }
        if ("student".equals(role)) {
            CertificateView view = views.findByCertificateAndStudent(certificate.getId(), student.getId())
                    .orElse(new CertificateView(null, certificate.getId(), student.getId(), Instant.now(), ip, userAgent));
            view.setViewedAt(Instant.now());
            view.setIpAddress(ip);
            view.setUserAgent(userAgent);
            views.save(view);
        }
        Map<String, Object> response = mapper.certificate(certificate, "");
        response.put("status", certificate.resolvedStatus());
        return response;
    }

    public Map<String, Object> verify(String studentId, String token) {
        Student student = students.findByStudentIdIgnoreCase(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Certificate not found"));
        Certificate certificate = latest(student.getStudentId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Certificate not found"));
        boolean tokenValid = token != null && !token.isBlank()
                && files.verifyToken(token, studentId)
                && token.equals(certificate.getVerificationToken());
        String status = token != null && !token.isBlank() && !tokenValid ? "INVALID" : certificate.resolvedStatus();
        boolean valid = "VALID".equals(status) && (token == null || token.isBlank() || tokenValid);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("valid", valid);
        response.put("certificate_status", status);
        response.put("student_id", student.getStudentId());
        response.put("student_name", student.getName());
        response.put("course_name", certificate.getCourseName());
        response.put("issue_date", certificate.getIssueDate());
        response.put("expires_at", certificate.getExpiresAt());
        Map<String, Object> mapped = mapper.certificate(certificate, "");
        response.put("certificate", mapped.get("certificate"));
        response.put("download_url", mapped.get("download_url"));
        response.put("certificate_available", certificate.getCertificateFileUrl() != null);
        response.put("token_valid", token == null || token.isBlank() ? null : tokenValid);
        return response;
    }

    public FileDownload download(String studentId, String role, String callerStudentId) throws IOException {
        authorizeStudent(role, callerStudentId, studentId);
        Certificate certificate = latest(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Certificate file not available"));
        if ("REVOKED".equals(certificate.resolvedStatus())) {
            throw new ApiException(HttpStatus.GONE, "Certificate has been revoked");
        }
        Path file = files.path(certificate.getCertificateFileKey());
        if (!Files.isRegularFile(file)) throw new ApiException(HttpStatus.NOT_FOUND, "Certificate file not available");
        return new FileDownload(Files.readAllBytes(file), studentId + "-certificate." + extension(certificate.getCertificateFileKey()));
    }

    public void downloadAll(OutputStream output) throws IOException {
        if (certificates.countByStatusNot("REVOKED") == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No certificates to download");
        }
        Query query = Query.query(Criteria.where("status").ne("REVOKED"))
                .with(Sort.by(Sort.Direction.ASC, "studentId"));
        try (var certificateStream = mongo.stream(query, Certificate.class);
                var zip = new java.util.zip.ZipOutputStream(output)) {
            var iterator = certificateStream.iterator();
            while (iterator.hasNext()) {
                Certificate item = iterator.next();
                Path file = files.path(item.getCertificateFileKey());
                if (!Files.isRegularFile(file)) continue;
                zip.putNextEntry(new java.util.zip.ZipEntry(item.getStudentId() + "-" + item.getId()
                        + "." + extension(file.toString())));
                Files.copy(file, zip);
                zip.closeEntry();
            }
            zip.finish();
        }
    }

    public List<Map<String, Object>> views(String studentId) {
        Certificate certificate = latest(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Certificate not found"));
        return views.findByCertificateOrderByViewedAtDesc(certificate.getId()).stream().map(view -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("viewed_at", view.getViewedAt());
            item.put("ip_address", view.getIpAddress());
            item.put("user_agent", view.getUserAgent());
            return item;
        }).toList();
    }

    public Map<String, Object> revoke(String id, String reason) {
        Certificate certificate = certificates.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Certificate not found"));
        certificate.setStatus("REVOKED");
        certificate.setRevokedAt(Instant.now());
        certificate.setRevokedReason(reason == null || reason.isBlank() ? "Revoked by administrator" : reason);
        return mapper.certificate(certificates.save(certificate), "");
    }

    public Path filePath(String key) {
        return files.path(key);
    }

    private java.util.Optional<Certificate> latest(String studentId) {
        return certificates.findFirstByStudentIdIgnoreCaseOrderByCreatedAtDesc(studentId);
    }

    private void authorizeStudent(String role, String callerStudentId, String targetStudentId) {
        if ("student".equals(role) && !targetStudentId.equalsIgnoreCase(callerStudentId == null ? "" : callerStudentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not authorized");
        }
    }

    private Instant parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        } catch (DateTimeParseException ignored) {
            try {
                return Instant.parse(value);
            } catch (DateTimeParseException exception) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Date must use ISO format");
            }
        }
    }

    private String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "pdf" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String dateRange(String startDate, String endDate) {
        if (startDate == null || startDate.isBlank()) return endDate == null ? "" : endDate;
        if (endDate == null || endDate.isBlank()) return startDate;
        return startDate + " to " + endDate;
    }

    private void validateFileSignature(byte[] bytes, String extension) {
        boolean valid = switch (extension) {
            case "pdf" -> bytes.length >= 5 && new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-");
            case "png" -> bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47;
            case "jpg", "jpeg" -> bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff;
            default -> false;
        };
        if (!valid) throw new ApiException(HttpStatus.BAD_REQUEST, "File contents do not match the selected certificate type");
    }

    public record FileDownload(byte[] bytes, String filename) {}
}
