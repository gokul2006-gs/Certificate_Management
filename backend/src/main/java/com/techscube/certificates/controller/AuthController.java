package com.techscube.certificates.controller;

import com.techscube.certificates.dto.ApiDtos.LoginRequest;
import com.techscube.certificates.security.SessionPrincipal;
import com.techscube.certificates.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final String cookieName;
    private final boolean cookieSecure;
    private final String cookieSameSite;

    public AuthController(
            AuthService auth,
            @Value("${app.cookie-name}") String cookieName,
            @Value("${app.cookie-secure}") boolean cookieSecure,
            @Value("${app.cookie-same-site}") String cookieSameSite) {
        this.auth = auth;
        this.cookieName = cookieName;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
    }

    @PostMapping("/admin/login")
    public Map<String, Object> adminLogin(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        var result = auth.loginAdmin(request.username(), request.password(), servletRequest);
        setCookies(response, result.token(), 7 * 24 * 60 * 60L);
        return result.body();
    }

    @PostMapping("/student/login")
    public Map<String, Object> studentLogin(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var result = auth.loginStudent(request.studentId(), request.password());
        setCookies(response, result.token(), 7 * 24 * 60 * 60L);
        return result.body();
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        return "admin".equalsIgnoreCase(request.role())
                ? adminLogin(request, servletRequest, response)
                : studentLogin(request, response);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(Authentication authentication, HttpServletResponse response) {
        SessionPrincipal principal = principal(authentication);
        auth.logout(principal);
        setCookies(response, "", 0);
        return Map.of("message", "Logged out");
    }

    @GetMapping("/session")
    public Map<String, Object> session(Authentication authentication) {
        return auth.session(principal(authentication));
    }

    @GetMapping("/csrf")
    public Map<String, String> csrfToken(HttpServletRequest request, HttpServletResponse response) {
        String csrfToken = request.getCookies() == null ? null : Arrays.stream(request.getCookies())
                .filter(cookie -> "sc_csrf".equals(cookie.getName()))
                .map(jakarta.servlet.http.Cookie::getValue)
                .findFirst().orElse(null);
        if (csrfToken == null || csrfToken.isBlank()) {
            csrfToken = UUID.randomUUID().toString().replace("-", "");
            addCsrfCookie(response, csrfToken, 7 * 24 * 60 * 60L);
        }
        response.setHeader("X-CSRF-Token", csrfToken);
        return Map.of("csrfToken", csrfToken);
    }

    private SessionPrincipal principal(Authentication authentication) {
        return authentication != null && authentication.getPrincipal() instanceof SessionPrincipal session ? session : null;
    }

    private void setCookies(HttpServletResponse response, String token, long maxAge) {
        ResponseCookie cookie = ResponseCookie.from(cookieName, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(cookieSameSite)
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        String csrfToken = UUID.randomUUID().toString().replace("-", "");
        addCsrfCookie(response, csrfToken, maxAge);
        response.setHeader("X-CSRF-Token", csrfToken);
    }

    private void addCsrfCookie(HttpServletResponse response, String csrfToken, long maxAge) {
        ResponseCookie csrfCookie = ResponseCookie.from("sc_csrf", csrfToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .sameSite(cookieSameSite)
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, csrfCookie.toString());
    }
}
