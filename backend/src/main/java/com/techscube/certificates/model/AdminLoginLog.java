package com.techscube.certificates.model;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.IndexDirection;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document("adminloginlogs")
public class AdminLoginLog {
    @Id private String id;
    private String username;
    @Indexed(name = "loginAt_-1", direction = IndexDirection.DESCENDING) private Instant loginAt;
    private Instant logoutAt;
    private String ipAddress;
    private String userAgent;
}
