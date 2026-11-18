package com.techscube.certificates.controller;

import com.techscube.certificates.dto.ApiDtos.BulkDeleteRequest;
import com.techscube.certificates.dto.ApiDtos.StudentRequest;
import com.techscube.certificates.dto.ApiDtos.StudentUpdateRequest;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.security.SessionPrincipal;
import com.techscube.certificates.service.StudentImportService;
import com.techscube.certificates.service.StudentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService students;
    private final StudentImportService importer;

    public StudentController(StudentService students, StudentImportService importer) {
        this.students = students;
        this.importer = importer;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Object list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        boolean paginated = page != null || pageSize != null;
        Map<String, Object> result = students.list(search == null ? q : search, safePage(page), safePageSize(pageSize), paginated);
        return paginated ? result : result.get("items");
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> create(@Valid @RequestBody StudentRequest request) {
        return students.create(request);
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> importStudents(@RequestPart("file") MultipartFile file) throws Exception {
        if (file.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Excel file is required");
        try {
            return importer.importWorkbook(file.getInputStream());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> bulkDelete(@Valid @RequestBody BulkDeleteRequest request) {
        return Map.of("deleted_count", students.bulkDelete(request.studentIds()));
    }

    @GetMapping("/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    public Map<String, Object> get(@PathVariable String studentId, Authentication authentication) {
        SessionPrincipal caller = principal(authentication);
        return students.get(studentId, caller.role(), caller.studentId());
    }

    @PutMapping("/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> update(@PathVariable String studentId, @Valid @RequestBody StudentUpdateRequest request) {
        return students.update(studentId, request);
    }

    @DeleteMapping("/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> delete(@PathVariable String studentId) {
        students.delete(studentId);
        return Map.of("message", "Student deleted");
    }

    private SessionPrincipal principal(Authentication authentication) {
        return (SessionPrincipal) authentication.getPrincipal();
    }

    private int safePage(Integer page) {
        return page == null ? 1 : Math.max(1, page);
    }

    private int safePageSize(Integer pageSize) {
        return pageSize == null ? 25 : Math.min(100, Math.max(1, pageSize));
    }
}
