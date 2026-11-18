package com.techscube.certificates.controller;

import com.techscube.certificates.service.CertificateService;
import java.io.IOException;
import java.nio.file.Files;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final CertificateService certificates;

    public FileController(CertificateService certificates) {
        this.certificates = certificates;
    }

    @GetMapping("/{*key}")
    public ResponseEntity<ByteArrayResource> get(@PathVariable String key) throws IOException {
        String normalized = key.startsWith("/") ? key.substring(1) : key;
        var path = certificates.filePath(normalized);
        if (!Files.isRegularFile(path)) return ResponseEntity.notFound().build();
        String contentType = Files.probeContentType(path);
        MediaType type = contentType == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(contentType);
        return ResponseEntity.ok().contentType(type).body(new ByteArrayResource(Files.readAllBytes(path)));
    }
}
