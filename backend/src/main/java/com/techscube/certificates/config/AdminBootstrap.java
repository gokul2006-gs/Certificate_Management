package com.techscube.certificates.config;

import com.techscube.certificates.model.Admin;
import com.techscube.certificates.repository.AdminRepository;
import java.time.Instant;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    @Bean
    ApplicationRunner ensureConfiguredAdmin(
            AdminRepository admins,
            PasswordEncoder passwords,
            @Value("${app.admin-username}") String username,
            @Value("${app.admin-email}") String email,
            @Value("${app.admin-password}") String password) {
        return args -> {
            if (password == null || password.isBlank()) {
                log.warn("ADMIN_PASSWORD is not configured; no bootstrap administrator was created.");
                return;
            }
            String normalizedUsername = username.trim().toUpperCase(Locale.ROOT);
            if (admins.findByUsernameIgnoreCase(normalizedUsername).isPresent()) return;
            Instant now = Instant.now();
            admins.save(new Admin(null, normalizedUsername, email.trim().toLowerCase(Locale.ROOT),
                    passwords.encode(password), "admin", now, now));
            log.info("Created initial administrator account '{}'.", normalizedUsername);
        };
    }
}
