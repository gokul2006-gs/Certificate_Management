package com.techscube.certificates.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class ApiDtos {
    private ApiDtos() {}

    public record LoginRequest(
            String username,
            @JsonProperty("student_id") String studentId,
            @NotBlank String password,
            String role) {}

    public record StudentRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @JsonProperty("student_id") String studentId,
            String password) {}

    public record StudentUpdateRequest(
            @Size(max = 160) String name,
            @Email @Size(max = 254) String email,
            String password) {}

    public record CourseRequest(
            @JsonProperty("course_name") @NotBlank @Size(max = 160) String courseName,
            @NotBlank @Size(max = 100) String duration,
            @JsonProperty("course_type") String courseType) {}

    public record BulkDeleteRequest(@JsonProperty("student_ids") @NotEmpty @Size(max = 500) List<String> studentIds) {}
    public record RevokeRequest(String reason) {}
}
