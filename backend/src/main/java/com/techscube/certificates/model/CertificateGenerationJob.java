package com.techscube.certificates.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("certificategenerationjobs")
public class CertificateGenerationJob {
    @Id private String id;
    @Indexed(name = "status_1") private String status;
    private String templateFileUrl;
    private String templateFileKey;
    private List<String> studentIds = new ArrayList<>();
    private Map<String, Object> fields;
    private String courseName;
    private String issueDate;
    private String startDate;
    private String endDate;
    private Instant expiresAt;
    private int processedCount;
    private int createdCount;
    private int skippedCount;
    private List<Map<String, Object>> skippedDetails = new ArrayList<>();
    private List<Map<String, Object>> recentCreated = new ArrayList<>();
    private List<Map<String, Object>> recentSkipped = new ArrayList<>();
    private String errorMessage;
    private boolean cancelRequested;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant completedAt;
}
