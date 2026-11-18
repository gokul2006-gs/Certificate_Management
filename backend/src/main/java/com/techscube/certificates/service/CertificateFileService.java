package com.techscube.certificates.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.model.Student;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CertificateFileService {
    private final Path uploadRoot;
    private final String jwtSecret;

    public CertificateFileService(
            @Value("${app.upload-root}") String uploadRoot,
            @Value("${app.jwt-secret}") String jwtSecret) {
        this.uploadRoot = Path.of(uploadRoot).toAbsolutePath().normalize();
        this.jwtSecret = jwtSecret;
    }

    public StoredFile saveCertificate(String studentId, String extension, byte[] bytes) throws IOException {
        return save("certificates/" + studentId + "-" + uniqueId() + "." + extension, bytes);
    }

    public StoredFile saveQr(String studentId, byte[] bytes) throws IOException {
        return save("qrcodes/" + studentId + "-" + uniqueId() + ".png", bytes);
    }

    public StoredFile saveTemplate(String filename, byte[] bytes) throws IOException {
        return save("templates/" + uniqueId() + "-" + Path.of(filename).getFileName(), bytes);
    }

    public byte[] createQr(String content) {
        try {
            var matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 320, 320);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate certificate QR code");
        }
    }

    public byte[] generatePdf(Student student, String courseName, Instant issueDate) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDRectangle pageSize = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage page = new PDPage(pageSize);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 28);
                content.newLineAtOffset(110, 430);
                content.showText("Certificate of Completion");
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 16);
                content.newLineAtOffset(0, -55);
                content.showText("This certificate is awarded to " + pdfText(student.getName()));
                content.newLineAtOffset(0, -30);
                content.showText("for completing " + pdfText(courseName == null || courseName.isBlank() ? "the program" : courseName));
                content.newLineAtOffset(0, -35);
                content.showText("Issued " + date(issueDate));
                content.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    public byte[] generateTemplatePdf(
            Student student, String courseName, Instant issueDate, String issueDateLabel,
            byte[] templateBytes, Map<String, Object> fields) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDRectangle pageSize = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage page = new PDPage(pageSize);
            document.addPage(page);
            PDImageXObject background = PDImageXObject.createFromByteArray(document, templateBytes, "certificate-template");
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.drawImage(background, 0, 0, pageSize.getWidth(), pageSize.getHeight());
                drawTemplateField(content, pageSize, fields.get("name"), pdfText(student.getName()), 45);
                drawTemplateField(content, pageSize, fields.get("course"), pdfText(courseName == null ? "" : courseName), 67);
                drawTemplateField(content, pageSize, fields.get("issue_date"),
                        issueDateLabel == null || issueDateLabel.isBlank() ? date(issueDate) : pdfText(issueDateLabel), 78);
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    public byte[] renderImage(
            byte[] imageBytes, Student student, String courseName, String issueDate, Map<String, Object> fields) throws IOException {
        BufferedImage image;
        try (var imageStream = ImageIO.createImageInputStream(new ByteArrayInputStream(imageBytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageStream);
            if (!readers.hasNext()) throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported certificate image");
            ImageReader reader = readers.next();
            try {
                reader.setInput(imageStream, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if ((long) width * height > 40_000_000L) {
                    throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Certificate image dimensions exceed the allowed limit");
                }
                image = reader.read(0);
            } finally {
                reader.dispose();
            }
        }
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            drawImageField(graphics, image, fields.get("name"), student.getName(), 46);
            drawImageField(graphics, image, fields.get("course"), courseName == null ? "" : courseName, 67);
            drawImageField(graphics, image, fields.get("issue_date"), issueDate == null ? LocalDate.now().toString() : issueDate, 78);
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }

    public Path path(String key) {
        Path file = uploadRoot.resolve(key).normalize();
        if (!file.startsWith(uploadRoot)) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file path");
        return file;
    }

    public boolean verifyToken(String token, String expectedStudentId) {
        if (token == null) return false;
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3 || !parts[0].equalsIgnoreCase(expectedStudentId)) return false;
        return MessageDigest.isEqual(parts[2].getBytes(java.nio.charset.StandardCharsets.UTF_8),
                sign(parts[0] + "." + parts[1]).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    public String verificationToken(String studentId) {
        String payload = studentId.toUpperCase(Locale.ROOT) + "." + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        return payload + "." + sign(payload);
    }

    private StoredFile save(String key, byte[] bytes) throws IOException {
        Path file = path(key);
        Files.createDirectories(file.getParent());
        Files.write(file, bytes);
        return new StoredFile(key, "/api/files/" + key);
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not sign verification token", exception);
        }
    }

    private void drawTemplateField(PDPageContentStream content, PDRectangle page, Object raw, String text, float defaultY) throws IOException {
        float x1 = 25, y1 = defaultY - 3, x2 = 75, y2 = defaultY + 3;
        if (raw instanceof Map<?, ?> field) {
            x1 = number(field.get("x1"), x1);
            y1 = number(field.get("y1"), y1);
            x2 = number(field.get("x2"), x2);
            y2 = number(field.get("y2"), y2);
        }
        float centerX = page.getWidth() * ((x1 + x2) / 200f);
        float centerY = page.getHeight() * (1 - (y1 + y2) / 200f);
        float fontSize = 20;
        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        float textWidth = font.getStringWidth(text) / 1000 * fontSize;
        content.beginText();
        content.setFont(font, fontSize);
        content.newLineAtOffset(Math.max(8, centerX - textWidth / 2), Math.max(8, centerY));
        content.showText(text);
        content.endText();
    }

    private void drawImageField(Graphics2D graphics, BufferedImage image, Object raw, String value, float defaultY) {
        float x1 = 20, y1 = defaultY - 3, x2 = 80, y2 = defaultY + 3;
        if (raw instanceof Map<?, ?> field) {
            x1 = number(field.get("x1"), x1);
            y1 = number(field.get("y1"), y1);
            x2 = number(field.get("x2"), x2);
            y2 = number(field.get("y2"), y2);
        }
        int left = Math.round(image.getWidth() * x1 / 100);
        int right = Math.round(image.getWidth() * x2 / 100);
        int top = Math.round(image.getHeight() * y1 / 100);
        int bottom = Math.round(image.getHeight() * y2 / 100);
        int fontSize = Math.max(12, Math.min(64, (bottom - top) / 2));
        graphics.setColor(Color.BLACK);
        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, fontSize));
        var metrics = graphics.getFontMetrics();
        int textX = left + Math.max(0, (right - left - metrics.stringWidth(value)) / 2);
        int textY = top + Math.max(fontSize, (bottom - top + metrics.getAscent()) / 2);
        graphics.drawString(value, textX, textY);
    }

    private float number(Object value, float fallback) {
        return value instanceof Number number ? number.floatValue() : fallback;
    }

    private String date(Instant value) {
        return value == null ? LocalDate.now().toString() : value.toString().substring(0, 10);
    }

    private String pdfText(String value) {
        return value == null ? "" : value.replaceAll("[^\\x20-\\x7E]", "?");
    }

    private String uniqueId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public record StoredFile(String key, String url) {}
}
