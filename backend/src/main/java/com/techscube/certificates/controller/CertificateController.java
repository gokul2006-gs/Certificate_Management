package com.techscube.certificates.controller;

import com.techscube.certificates.dto.ApiDtos.RevokeRequest;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.security.SessionPrincipal;
import com.techscube.certificates.service.CertificateService;
import com.techscube.certificates.service.GenerationJobService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {
    private final CertificateService certificates;
    private final GenerationJobService generationJobs;

    public CertificateController(CertificateService certificates, GenerationJobService generationJobs) {
        this.certificates = certificates;
        this.generationJobs = generationJobs;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "25") int pageSize) {
        return certificates.list(search, status, Math.max(1, page), Math.min(100, Math.max(1, pageSize)));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> upload(
            @RequestParam("student_id") String studentId,
            @RequestPart("certificate_file") MultipartFile file,
            @RequestParam(required = false, name = "course_name") String courseName,
            @RequestParam(required = false, name = "start_date") String issueDate,
            @RequestParam(required = false, name = "end_date") String endDate,
            @RequestParam(required = false, name = "expires_at") String expiresAt,
            @RequestParam(required = false) String fields) throws IOException {
        return certificates.upload(studentId, file, courseName, issueDate, endDate, expiresAt, fields);
    }

    @PostMapping("/bulk-upload")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> bulkUpload(
            @RequestParam(required = false, name = "certificate_files") List<MultipartFile> files,
            @RequestPart(required = false, name = "zip_file") MultipartFile archive,
            @RequestParam(required = false, name = "course_name") String courseName,
            @RequestParam(required = false, name = "expires_at") String expiresAt) throws IOException {
        List<MultipartFile> input = new ArrayList<>(files == null ? List.of() : files);
        if (archive != null && !archive.isEmpty()) input.addAll(unzip(archive));
        if (input.isEmpty()) throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "No certificate files supplied");
        long totalBytes = input.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalBytes > 80L * 1024 * 1024) {
            throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "Expanded certificate files exceed the upload limit");
        }
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        for (MultipartFile file : input) {
            String name = file.getOriginalFilename() == null ? "" : java.nio.file.Path.of(file.getOriginalFilename()).getFileName().toString();
            String id = studentIdFromFilename(name);
            if (id == null) {
                skipped.add(Map.of("file", name, "reason", "Could not read student ID from filename"));
                continue;
            }
            try {
                Map<String, Object> result = certificates.upload(id, file, courseName, null, null, expiresAt, null);
                Map<String, Object> item = new LinkedHashMap<>(result);
                item.put("file", name);
                item.put("student_id", id);
                created.add(item);
            } catch (ApiException exception) {
                skipped.add(Map.of("file", name, "student_id", id, "reason", exception.getMessage()));
            }
        }
        return Map.of("created_count", created.size(), "skipped_count", skipped.size(), "created", created, "skipped", skipped);
    }

    @PostMapping("/generation-jobs")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> createGenerationJob(
            @RequestPart("template_file") MultipartFile template,
            @RequestParam(required = false, name = "course_name") String courseName,
            @RequestParam(required = false) String fields,
            @RequestParam(required = false, name = "start_date") String startDate,
            @RequestParam(required = false, name = "end_date") String endDate,
            @RequestParam(required = false, name = "expires_at") String expiresAt) throws IOException {
        return generationJobs.create(template, fields, courseName, startDate, endDate, expiresAt);
    }

    @GetMapping("/generation-jobs/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> generationStatus(@PathVariable String jobId) {
        return generationJobs.status(jobId);
    }

    @PostMapping("/generation-jobs/{jobId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> cancelGeneration(@PathVariable String jobId) {
        return generationJobs.cancel(jobId);
    }

    @GetMapping("/verify/{studentId}")
    public Map<String, Object> verify(
            @PathVariable String studentId,
            @RequestParam(required = false) String token,
            HttpServletRequest request) {
        String verificationToken = token == null ? request.getHeader("x-verification-token") : token;
        return certificates.verify(studentId, verificationToken);
    }

    @GetMapping("/view/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    public Map<String, Object> view(
            @PathVariable String studentId, Authentication authentication, HttpServletRequest request) {
        SessionPrincipal caller = (SessionPrincipal) authentication.getPrincipal();
        return certificates.view(studentId, caller.role(), caller.studentId(), clientIp(request), request.getHeader("User-Agent"));
    }

    @GetMapping("/download/{studentId}")
    public ResponseEntity<ByteArrayResource> download(
            @PathVariable String studentId, Authentication authentication) throws IOException {
        SessionPrincipal caller = authentication == null ? null : (SessionPrincipal) authentication.getPrincipal();
        var result = certificates.download(studentId, caller == null ? null : caller.role(), caller == null ? null : caller.studentId());
        return ResponseEntity.ok()
                .contentType(mediaType(result.filename()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(result.filename()).build().toString())
                .body(new ByteArrayResource(result.bytes()));
    }

    @GetMapping("/download-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StreamingResponseBody> downloadAll() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=all_certificates.zip")
                .body(certificates::downloadAll);
    }

    @GetMapping("/views/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> views(@PathVariable String studentId) {
        return certificates.views(studentId);
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> revoke(@PathVariable String id, @Valid @RequestBody RevokeRequest request) {
        return certificates.revoke(id, request.reason());
    }

    private List<MultipartFile> unzip(MultipartFile archive) throws IOException {
        List<MultipartFile> files = new ArrayList<>();
        long expandedBytes = 0;
        try (ZipInputStream zip = new ZipInputStream(archive.getInputStream())) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) continue;
                String zipName = entry.getName().replace('\\', '/');
                String safeName = zipName.substring(zipName.lastIndexOf('/') + 1);
                if (safeName.isBlank()) continue;
                if (!List.of("pdf", "png", "jpg", "jpeg").contains(extension(safeName))) continue;
                byte[] content = readLimited(zip, 20 * 1024 * 1024);
                expandedBytes += content.length;
                if (expandedBytes > 80L * 1024 * 1024) {
                    throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "Expanded certificate files exceed the upload limit");
                }
                files.add(new InMemoryMultipartFile(safeName, content));
                if (files.size() >= 40) break;
            }
        }
        return files;
    }

    private String studentIdFromFilename(String filename) {
        var matcher = java.util.regex.Pattern.compile("(TSC\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(filename);
        return matcher.find() ? matcher.group(1).toUpperCase(java.util.Locale.ROOT) : null;
    }

    private byte[] readLimited(ZipInputStream input, int limit) throws IOException {
        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > limit) throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "ZIP entry exceeds the file size limit");
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(java.util.Locale.ROOT);
    }

    private MediaType mediaType(String filename) {
        return switch (extension(filename)) {
            case "pdf" -> MediaType.APPLICATION_PDF;
            case "png" -> MediaType.IMAGE_PNG;
            case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank() ? request.getRemoteAddr() : forwarded.split(",")[0].trim();
    }

    private static class InMemoryMultipartFile implements MultipartFile {
        private final String name;
        private final byte[] bytes;
        InMemoryMultipartFile(String name, byte[] bytes) { this.name = name; this.bytes = bytes; }
        public String getName() { return name; }
        public String getOriginalFilename() { return name; }
        public String getContentType() { return MediaType.APPLICATION_OCTET_STREAM_VALUE; }
        public boolean isEmpty() { return bytes.length == 0; }
        public long getSize() { return bytes.length; }
        public byte[] getBytes() { return bytes; }
        public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(bytes); }
        public void transferTo(java.io.File destination) throws IOException { java.nio.file.Files.write(destination.toPath(), bytes); }
    }
}
