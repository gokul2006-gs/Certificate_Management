package com.techscube.certificates.service;

import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.model.Admin;
import com.techscube.certificates.model.AdminLoginLog;
import com.techscube.certificates.model.Student;
import com.techscube.certificates.repository.AdminLoginLogRepository;
import com.techscube.certificates.repository.AdminRepository;
import com.techscube.certificates.repository.StudentRepository;
import com.techscube.certificates.security.JwtService;
import com.techscube.certificates.security.SessionPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final AdminRepository admins;
    private final StudentRepository students;
    private final AdminLoginLogRepository logs;
    private final PasswordEncoder passwords;
    private final JwtService jwtService;
    private final String defaultStudentPassword;

    public AuthService(
            AdminRepository admins,
            StudentRepository students,
            AdminLoginLogRepository logs,
            PasswordEncoder passwords,
            JwtService jwtService,
            @Value("${app.default-student-password}") String defaultStudentPassword) {
        this.admins = admins;
        this.students = students;
        this.logs = logs;
        this.passwords = passwords;
        this.jwtService = jwtService;
        this.defaultStudentPassword = defaultStudentPassword;
    }

    public AuthResult loginAdmin(String username, String password, HttpServletRequest request) {
        String normalized = username == null ? "" : username.trim().toUpperCase(Locale.ROOT);
        Admin admin = admins.findByUsernameIgnoreCase(normalized)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid admin credentials"));
        if (!passwords.matches(password, admin.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid admin credentials");
        }
        AdminLoginLog log = logs.save(new AdminLoginLog(null, admin.getUsername(), Instant.now(), null,
                clientIp(request), request.getHeader("User-Agent")));
        String token = jwtService.issue(new SessionPrincipal("admin", admin.getUsername(), null, log.getId()));
        return new AuthResult(token, Map.of("message", "Admin login success", "role", "admin", "username", admin.getUsername()));
    }

    public AuthResult loginStudent(String studentId, String password) {
        String normalized = studentId == null ? "" : studentId.trim().toUpperCase(Locale.ROOT);
        Student student = students.findByStudentIdIgnoreCase(normalized)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Student not found"));
        if (!passwords.matches(password, student.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid password");
        }
        String token = jwtService.issue(new SessionPrincipal("student", null, student.getStudentId(), null));
        return new AuthResult(token, Map.of("message", "Student login success", "role", "student",
                "student_id", student.getStudentId(), "name", student.getName()));
    }

    public void logout(SessionPrincipal principal) {
        if (principal != null && principal.logId() != null) {
            logs.findById(principal.logId()).ifPresent(log -> {
                log.setLogoutAt(Instant.now());
                logs.save(log);
            });
        }
    }

    public Map<String, Object> session(SessionPrincipal principal) {
        if (principal == null) {
            Map<String, Object> guest = new LinkedHashMap<>();
            guest.put("authenticated", false);
            guest.put("role", null);
            guest.put("student_id", null);
            guest.put("is_admin", false);
            return guest;
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("authenticated", true);
        response.put("role", principal.role());
        response.put("student_id", principal.studentId());
        response.put("is_admin", "admin".equals(principal.role()));
        if (principal.username() != null) response.put("username", principal.username());
        return response;
    }

    public String defaultStudentPassword() {
        return defaultStudentPassword;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",")[0].trim();
    }

    public record AuthResult(String token, Map<String, Object> body) {}
}
