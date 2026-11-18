package com.techscube.certificates.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final String cookieName;

    public JwtAuthenticationFilter(JwtService jwtService, @Value("${app.cookie-name}") String cookieName) {
        this.jwtService = jwtService;
        this.cookieName = cookieName;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = bearerToken(request);
        if (token == null && request.getCookies() != null) {
            token = Arrays.stream(request.getCookies())
                    .filter(cookie -> cookieName.equals(cookie.getName()))
                    .map(Cookie::getValue)
                    .findFirst().orElse(null);
        }
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                SessionPrincipal principal = jwtService.parse(token);
                var authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        token,
                        java.util.List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().toUpperCase())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof SessionPrincipal
                && !ListSafeMethods.isSafe(request.getMethod())
                && !hasValidCsrfToken(request)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "CSRF token is missing or invalid");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean hasValidCsrfToken(HttpServletRequest request) {
        String cookieToken = request.getCookies() == null ? null : Arrays.stream(request.getCookies())
                .filter(cookie -> "sc_csrf".equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst().orElse(null);
        String headerToken = request.getHeader("X-CSRF-Token");
        return cookieToken != null && headerToken != null
                && MessageDigest.isEqual(cookieToken.getBytes(StandardCharsets.UTF_8), headerToken.getBytes(StandardCharsets.UTF_8));
    }

    private static final class ListSafeMethods {
        private ListSafeMethods() {}
        static boolean isSafe(String method) {
            return "GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method);
        }
    }

    private String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
    }
}
