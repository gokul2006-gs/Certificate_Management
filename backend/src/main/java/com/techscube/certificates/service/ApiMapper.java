package com.techscube.certificates.service;

import com.techscube.certificates.model.Certificate;
import com.techscube.certificates.model.Course;
import com.techscube.certificates.model.Student;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ApiMapper {
    @Value("${app.frontend-url}") private String frontendUrl;
    @Value("${app.api-public-url:}") private String publicApiUrl;

    public Map<String, Object> student(Student student) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", student.getId());
        result.put("student_id", student.getStudentId());
        result.put("name", student.getName());
        result.put("email", student.getEmail());
        result.put("created_at", student.getCreatedAt());
        return result;
    }

    public Map<String, Object> course(Course course) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", course.getId());
        result.put("course_name", course.getCourseName());
        result.put("duration", course.getDuration());
        result.put("course_type", course.getCourseType());
        return result;
    }

    public Map<String, Object> certificate(Certificate certificate, String origin) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", certificate.getId());
        result.put("student_id", certificate.getStudentId());
        result.put("course_name", certificate.getCourseName());
        result.put("issue_date", certificate.getIssueDate());
        result.put("expires_at", certificate.getExpiresAt());
        result.put("certificate_status", certificate.resolvedStatus());
        result.put("status", certificate.resolvedStatus());
        result.put("certificate", absoluteUrl(origin, certificate.getCertificateFileUrl()));
        result.put("qr", absoluteUrl(origin, certificate.getQrCodeUrl()));
        result.put("verification_url", verificationUrl(certificate, origin));
        result.put("download_url", absoluteUrl(origin, "/api/certificates/download/" + certificate.getStudentId()));
        result.put("certificate_available", certificate.getCertificateFileUrl() != null);
        result.put("revoked_at", certificate.getRevokedAt());
        result.put("revoked_reason", certificate.getRevokedReason());
        return result;
    }

    public String verificationUrl(Certificate certificate, String origin) {
        return frontendUrl.replaceAll("/+$", "") + "/verify/" + certificate.getStudentId()
                + "?token=" + certificate.getVerificationToken();
    }

    private String absoluteUrl(String origin, String value) {
        if (value == null || value.isBlank()) return "";
        if (value.startsWith("http://") || value.startsWith("https://")) return value;
        String base = origin == null || origin.isBlank()
                ? (publicApiUrl == null || publicApiUrl.isBlank() ? "http://localhost:8080" : publicApiUrl.replaceAll("/+$", ""))
                : origin;
        return base + value;
    }
}
