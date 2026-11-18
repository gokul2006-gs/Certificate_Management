package com.techscube.certificates.model;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("certificates")
@CompoundIndex(name = "status_1_expiresAt_1", def = "{'status': 1, 'expiresAt': 1}")
@CompoundIndex(name = "issueDate_1", def = "{'issueDate': 1}")
public class Certificate {
    @Id private String id;
    @Indexed(name = "student_1")
    @Field(targetType = FieldType.OBJECT_ID)
    private String student;
    @Indexed(name = "studentId_1") private String studentId;
    private String certificateFileUrl;
    private String certificateFileKey;
    private String qrCodeUrl;
    private String qrCodeKey;
    @Indexed(name = "verificationToken_1", unique = true) private String verificationToken;
    private String courseName;
    private Instant issueDate;
    private Instant expiresAt;
    @Indexed(name = "status_1") private String status;
    private Instant revokedAt;
    private String revokedReason;
    private Instant expiryNotificationSentAt;
    private Instant createdAt;
    private Instant updatedAt;

    public String resolvedStatus() {
        if ("REVOKED".equals(status)) return "REVOKED";
        if (expiresAt != null && expiresAt.isBefore(Instant.now())) return "EXPIRED";
        return status == null ? "VALID" : status;
    }
}
