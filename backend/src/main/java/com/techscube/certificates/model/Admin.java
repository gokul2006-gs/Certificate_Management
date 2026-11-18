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
@Document("admins")
public class Admin {
    @Id private String id;
    @Indexed(name = "username_1", unique = true) private String username;
    @Indexed(name = "email_1", unique = true) private String email;
    private String passwordHash;
    private String role = "admin";
    private Instant createdAt;
    private Instant updatedAt;
}
