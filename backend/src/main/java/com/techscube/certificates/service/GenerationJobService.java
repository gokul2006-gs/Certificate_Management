package com.techscube.certificates.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.model.CertificateGenerationJob;
import com.techscube.certificates.repository.CertificateGenerationJobRepository;
import com.techscube.certificates.repository.StudentRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class GenerationJobService {
    private final CertificateGenerationJobRepository jobs;
    private final StudentRepository students;
    private final GenerationWorker worker;
    private final ObjectMapper objectMapper;
    private final Path uploadRoot;

    public GenerationJobService(
            CertificateGenerationJobRepository jobs,
            StudentRepository students,
            GenerationWorker worker,
            ObjectMapper objectMapper,
            @Value("${app.upload-root}") String uploadRoot) {
        this.jobs = jobs;
        this.students = students;
        this.worker = worker;
        this.objectMapper = objectMapper;
        this.uploadRoot = Path.of(uploadRoot).toAbsolutePath().normalize();
    }

    public Map<String, Object> create(MultipartFile template, String rawFields, String courseName, String startDate,
            String endDate, String expiresAt) throws IOException {
        if (template == null || template.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Template file is required");
        String fileName = template.getOriginalFilename() == null ? "" : template.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!fileName.matches(".*\\.(png|jpe?g)$")) throw new ApiException(HttpStatus.BAD_REQUEST, "Template must be JPG or PNG");
        List<String> studentIds = students.findAll().stream().map(s -> s.getStudentId()).sorted().toList();
        if (studentIds.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Upload students first");
        Map<String, Object> fields = rawFields == null || rawFields.isBlank()
                ? new HashMap<>()
                : objectMapper.readValue(rawFields, new TypeReference<>() {});
        String safeName = Path.of(fileName).getFileName().toString();
        String key = "templates/" + UUID.randomUUID().toString().replace("-", "") + "-" + safeName;
        Path file = uploadRoot.resolve(key).normalize();
        if (!file.startsWith(uploadRoot)) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid template file");
        Files.createDirectories(file.getParent());
        byte[] templateBytes = template.getBytes();
        Files.write(file, templateBytes);
        Instant expiry = null;
        if (expiresAt != null && !expiresAt.isBlank()) expiry = java.time.LocalDate.parse(expiresAt).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        Instant now = Instant.now();
        CertificateGenerationJob job = jobs.save(new CertificateGenerationJob(null, "pending", "/api/files/" + key, key,
                studentIds, fields, courseName == null ? "" : courseName, startDate, startDate, endDate, expiry,
                0, 0, 0, new ArrayList<>(), new ArrayList<>(), new ArrayList<>(), "", false, now, now, null));
        worker.process(job.getId(), templateBytes);
        return serialize(job);
    }

    public Map<String, Object> status(String id) {
        return serialize(jobs.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Job not found")));
    }

    public Map<String, Object> cancel(String id) {
        CertificateGenerationJob job = jobs.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Job not found"));
        job.setCancelRequested(true);
        if ("pending".equals(job.getStatus()) || "processing".equals(job.getStatus())) {
            job.setStatus("cancelled");
            job.setCompletedAt(Instant.now());
        }
        job.setUpdatedAt(Instant.now());
        return serialize(jobs.save(job));
    }

    private Map<String, Object> serialize(CertificateGenerationJob job) {
        int total = job.getStudentIds() == null ? 0 : job.getStudentIds().size();
        Map<String, Object> result = new HashMap<>();
        result.put("job_id", job.getId());
        result.put("status", job.getStatus());
        result.put("total_count", total);
        result.put("processed_count", job.getProcessedCount());
        result.put("created_count", job.getCreatedCount());
        result.put("skipped_count", job.getSkippedCount());
        result.put("progress_percent", total == 0 ? 100 : Math.round((float) job.getProcessedCount() * 100 / total));
        result.put("error_message", job.getErrorMessage());
        result.put("created_at", job.getCreatedAt());
        result.put("completed_at", job.getCompletedAt());
        result.put("recent_created", job.getRecentCreated() == null ? List.of() : job.getRecentCreated());
        result.put("recent_skipped", job.getRecentSkipped() == null ? List.of() : job.getRecentSkipped());
        result.put("skipped", "completed".equals(job.getStatus()) && job.getSkippedDetails() != null
                ? job.getSkippedDetails() : List.of());
        return result;
    }
}
