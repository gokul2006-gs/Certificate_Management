package com.techscube.certificates.controller;

import com.mongodb.client.MongoDatabase;
import com.techscube.certificates.model.AdminLoginLog;
import com.techscube.certificates.model.Certificate;
import com.techscube.certificates.model.Course;
import com.techscube.certificates.model.Student;
import com.techscube.certificates.repository.AdminLoginLogRepository;
import com.techscube.certificates.repository.CertificateRepository;
import com.techscube.certificates.repository.CourseRepository;
import com.techscube.certificates.repository.StudentRepository;
import com.techscube.certificates.service.ApiMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final StudentRepository students;
    private final CourseRepository courses;
    private final CertificateRepository certificates;
    private final AdminLoginLogRepository logs;
    private final MongoTemplate mongo;
    private final ApiMapper mapper;

    public AdminController(
            StudentRepository students,
            CourseRepository courses,
            CertificateRepository certificates,
            AdminLoginLogRepository logs,
            MongoTemplate mongo,
            ApiMapper mapper) {
        this.students = students;
        this.courses = courses;
        this.certificates = certificates;
        this.logs = logs;
        this.mongo = mongo;
        this.mapper = mapper;
    }

    @GetMapping("/dashboard-stats")
    public Map<String, Object> dashboardStats() {
        Instant now = Instant.now();
        Instant expiryLimit = now.plusSeconds(30L * 24 * 60 * 60);
        Instant activityStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).minusMonths(5).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<Certificate> expiring = certificates.findTop4ByStatusAndExpiresAtAfterAndExpiresAtLessThanEqualOrderByExpiresAtAsc(
                "VALID", now, expiryLimit);
        List<Map<String, Object>> expiryRows = new ArrayList<>();
        for (Certificate certificate : expiring) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", certificate.getId());
            row.put("student_id", certificate.getStudentId());
            row.put("course_name", certificate.getCourseName());
            row.put("expires_at", certificate.getExpiresAt());
            students.findById(certificate.getStudent()).ifPresent(student -> row.put("student_name", student.getName()));
            expiryRows.add(row);
        }
        List<Map> activity = mongo.aggregate(
                org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation(
                        (AggregationOperation) context -> new Document("$match", new Document("issueDate", new Document("$gte", activityStart))),
                        (AggregationOperation) context -> new Document("$group", new Document("_id",
                                new Document("$dateToString", new Document("format", "%Y-%m").append("date", "$issueDate").append("timezone", "UTC")))
                                .append("count", new Document("$sum", 1))),
                        (AggregationOperation) context -> new Document("$project", new Document("_id", 0).append("month", "$_id").append("count", 1)),
                        (AggregationOperation) context -> new Document("$sort", new Document("month", 1))),
                "certificates", Map.class).getMappedResults();

        return Map.of(
                "students", students.count(),
                "courses", courses.count(),
                "certificates", certificates.count(),
                "expiringSoon", certificates.countByStatusAndExpiresAtAfterAndExpiresAtLessThanEqual("VALID", now, expiryLimit),
                "expiringCertificates", expiryRows,
                "certificateActivity", activity);
    }

    @GetMapping("/login-logs")
    public Map<String, Object> loginLogs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        int currentPage = page == null ? 1 : Math.max(1, page);
        int size = pageSize == null ? 25 : Math.min(100, Math.max(1, pageSize));
        var pageResult = logs.findAll(PageRequest.of(currentPage - 1, size, Sort.by(Sort.Direction.DESC, "loginAt")));
        List<Map<String, Object>> items = pageResult.getContent().stream().map(log -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", log.getId());
            row.put("username", log.getUsername());
            row.put("login_at", log.getLoginAt());
            row.put("logout_at", log.getLogoutAt());
            row.put("ip_address", log.getIpAddress());
            return row;
        }).toList();
        return Map.of("items", items, "total", pageResult.getTotalElements(), "page", currentPage, "pageSize", size,
                "totalPages", pageResult.getTotalPages());
    }

    @GetMapping({"/database-status", "/db-connection"})
    public Map<String, Object> databaseStatus() {
        MongoDatabase database = mongo.getDb();
        database.runCommand(new Document("ping", 1));
        return Map.of("status", "connected", "database", database.getName());
    }
}
