package com.techscube.certificates.controller;

import com.techscube.certificates.dto.ApiDtos.CourseRequest;
import com.techscube.certificates.service.CourseService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/courses")
@PreAuthorize("hasRole('ADMIN')")
public class CourseController {
    private final CourseService courses;

    public CourseController(CourseService courses) {
        this.courses = courses;
    }

    @GetMapping
    public Object list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        boolean paginated = page != null || pageSize != null;
        Map<String, Object> result = courses.list(search, page == null ? 1 : Math.max(1, page),
                pageSize == null ? 25 : Math.min(100, Math.max(1, pageSize)), paginated);
        return paginated ? result : result.get("items");
    }

    @PostMapping
    public Map<String, Object> create(@Valid @RequestBody CourseRequest request) {
        return courses.create(request);
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @Valid @RequestBody CourseRequest request) {
        return courses.update(id, request);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        courses.delete(id);
        return Map.of("message", "Course deleted successfully");
    }
}
