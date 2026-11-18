package com.techscube.certificates.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    @Value("${app.jwt-secret}") private String secret;

    private SecretKey key() {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET must be at least 32 characters.");
        return Keys.hmacShaKeyFor(bytes);
    }

    public String issue(SessionPrincipal principal) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(principal.username() == null ? principal.studentId() : principal.username())
                .claim("role", principal.role())
                .claim("username", principal.username())
                .claim("studentId", principal.studentId())
                .claim("logId", principal.logId())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(7 * 24 * 60 * 60)))
                .signWith(key())
                .compact();
    }

    public SessionPrincipal parse(String token) {
        Claims claims = Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload();
        return new SessionPrincipal(
                claims.get("role", String.class),
                claims.get("username", String.class),
                claims.get("studentId", String.class),
                claims.get("logId", String.class));
    }
}
