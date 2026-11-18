package com.techscube.certificates.service;

import com.techscube.certificates.model.CertificateGenerationJob;
import com.techscube.certificates.repository.CertificateGenerationJobRepository;
import com.techscube.certificates.repository.StudentRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class GenerationWorker {
    private final CertificateGenerationJobRepository jobs;
    private final StudentRepository students;
    private final CertificateService certificates;

    public GenerationWorker(
            CertificateGenerationJobRepository jobs,
            StudentRepository students,
            CertificateService certificates) {
        this.jobs = jobs;
        this.students = students;
        this.certificates = certificates;
    }

    @Async
    public void process(String jobId, byte[] templateBytes) {
        CertificateGenerationJob job = jobs.findById(jobId).orElse(null);
        if (job == null) return;
        if (job.isCancelRequested()) return;
        job.setStatus("processing");
        jobs.save(job);
        List<Map<String, Object>> skippedDetails = new ArrayList<>();
        try {
            for (String studentId : job.getStudentIds()) {
                job = jobs.findById(jobId).orElse(null);
                if (job == null) return;
                if (job.isCancelRequested()) {
                    job.setStatus("cancelled");
                    job.setCompletedAt(Instant.now());
                    jobs.save(job);
                    return;
                }
                List<Map<String, Object>> recentCreated = new ArrayList<>();
                List<Map<String, Object>> recentSkipped = new ArrayList<>();
                var student = students.findByStudentIdIgnoreCase(studentId).orElse(null);
                if (student == null) {
                    recentSkipped.add(Map.of("student_id", studentId, "student_name", studentId, "reason", "Student not found"));
                } else {
                    try {
                        Instant issueDate = job.getStartDate() == null || job.getStartDate().isBlank()
                                ? Instant.now() : Instant.parse(job.getStartDate() + "T00:00:00Z");
                        String issueDateLabel = dateRange(job.getStartDate(), job.getEndDate());
                        Map<String, Object> issued = certificates.issueGeneratedPdfFromTemplate(student,
                                job.getCourseName(), issueDate, issueDateLabel, job.getExpiresAt(), templateBytes,
                                job.getFields() == null ? Map.of() : job.getFields());
                        Map<String, Object> row = new LinkedHashMap<>(issued);
                        row.put("student_id", student.getStudentId());
                        row.put("student_name", student.getName());
                        recentCreated.add(row);
                    } catch (RuntimeException exception) {
                        recentSkipped.add(Map.of("student_id", student.getStudentId(),
                                "student_name", student.getName(),
                                "reason", exception.getMessage() == null ? "Certificate generation failed" : exception.getMessage()));
                    }
                }
                skippedDetails.addAll(recentSkipped);
                job.setProcessedCount(job.getProcessedCount() + 1);
                job.setCreatedCount(job.getCreatedCount() + recentCreated.size());
                job.setSkippedCount(job.getSkippedCount() + recentSkipped.size());
                job.setRecentCreated(recentCreated);
                job.setRecentSkipped(recentSkipped);
                job.setSkippedDetails(skippedDetails.stream().skip(Math.max(0, skippedDetails.size() - 200)).toList());
                job.setStatus(job.getProcessedCount() >= job.getStudentIds().size() ? "completed" : "processing");
                if ("completed".equals(job.getStatus())) job.setCompletedAt(Instant.now());
                job.setUpdatedAt(Instant.now());
                jobs.save(job);
            }
        } catch (Exception exception) {
            job = jobs.findById(jobId).orElse(job);
            job.setStatus("failed");
            job.setErrorMessage(exception.getMessage() == null ? "Certificate generation failed" : exception.getMessage());
            job.setCompletedAt(Instant.now());
            jobs.save(job);
        }
    }

    private String dateRange(String startDate, String endDate) {
        if (startDate == null || startDate.isBlank()) return endDate == null ? "" : endDate;
        if (endDate == null || endDate.isBlank()) return startDate;
        return startDate + " to " + endDate;
    }
}
