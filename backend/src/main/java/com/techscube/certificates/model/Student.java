package com.techscube.certificates.model;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("students")
public class Student {
    @Id private String id;
    @Indexed(name = "studentId_1", unique = true) private String studentId;
    private String name;
    @Indexed(name = "email_1", unique = true) private String email;
    private String passwordHash;
    private Instant createdAt;
    private Instant updatedAt;
}
