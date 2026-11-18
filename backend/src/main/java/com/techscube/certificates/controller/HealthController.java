package com.techscube.certificates.controller;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {
    @Value("${app.storage-provider:local}") private String storageProvider;

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("ok", true, "storage", storageProvider);
    }
}
