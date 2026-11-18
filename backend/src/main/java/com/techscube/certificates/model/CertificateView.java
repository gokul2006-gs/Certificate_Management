package com.techscube.certificates.model;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("certificateviews")
@CompoundIndex(name = "certificate_1_student_1", def = "{'certificate': 1, 'student': 1}", unique = true)
public class CertificateView {
    @Id private String id;
    @Field(targetType = FieldType.OBJECT_ID) private String certificate;
    @Field(targetType = FieldType.OBJECT_ID) private String student;
    private Instant viewedAt;
    private String ipAddress;
    private String userAgent;
}
