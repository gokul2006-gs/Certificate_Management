package com.techscube.certificates.service;

import com.techscube.certificates.model.Certificate;
import com.techscube.certificates.model.Student;
import com.techscube.certificates.repository.CertificateRepository;
import com.techscube.certificates.repository.StudentRepository;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
    private final JavaMailSender mailSender;
    private final CertificateRepository certificates;
    private final StudentRepository students;
    private final String sender;
    private final String frontendUrl;

    public EmailNotificationService(
            JavaMailSender mailSender,
            CertificateRepository certificates,
            StudentRepository students,
            @Value("${app.mail-from:}") String sender,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.mailSender = mailSender;
        this.certificates = certificates;
        this.students = students;
        this.sender = sender;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Async
    public void certificateIssued(Student student, Certificate certificate) {
        if (!enabled()) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(student.getEmail());
        message.setSubject("Your certificate is ready");
        message.setText("Hello " + student.getName() + ",\n\nYour certificate for "
                + certificate.getCourseName() + " is ready. View and verify it at "
                + frontendUrl + "/verify/" + certificate.getStudentId() + ".\n");
        try {
            mailSender.send(message);
        } catch (RuntimeException exception) {
            log.error("Could not send certificate issue email to {}", student.getEmail(), exception);
        }
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "UTC")
    public void notifyUpcomingExpirations() {
        if (!enabled()) return;
        Instant now = Instant.now();
        Instant threshold = now.plusSeconds(30L * 24 * 60 * 60);
        List<Certificate> expiring = certificates
                .findByStatusAndExpiresAtGreaterThanEqualAndExpiresAtLessThanEqualAndExpiryNotificationSentAtIsNull(
                        "VALID", now, threshold);
        for (Certificate certificate : expiring) {
            Student student = students.findById(certificate.getStudent()).orElse(null);
            if (student == null || student.getEmail() == null || student.getEmail().isBlank()) continue;
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(sender);
                message.setTo(student.getEmail());
                message.setSubject("Your certificate is expiring soon");
                message.setText("Hello " + student.getName() + ",\n\nYour certificate for "
                        + certificate.getCourseName() + " expires on " + certificate.getExpiresAt()
                        + ". Please contact your administrator if you need assistance.\n");
                mailSender.send(message);
                certificate.setExpiryNotificationSentAt(now);
                certificates.save(certificate);
            } catch (RuntimeException exception) {
                log.error("Could not send expiry notification for certificate {}", certificate.getId(), exception);
            }
        }
    }

    private boolean enabled() {
        return sender != null && !sender.isBlank();
    }
}
