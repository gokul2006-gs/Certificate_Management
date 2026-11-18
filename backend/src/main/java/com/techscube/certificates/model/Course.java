package com.techscube.certificates.model;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("courses")
public class Course {
    @Id private String id;
    private String courseName;
    private String duration;
    private String courseType = "Technical";
    private Instant createdAt;
    private Instant updatedAt;
}
