package com.techscube.certificates.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.techscube.certificates.exception.ApiException;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class CertificateFileServiceTest {
    @Test
    void verificationTokenIsBoundToStudentIdAndSignature() {
        CertificateFileService files = new CertificateFileService(
                Path.of("target", "test-uploads").toString(),
                "unit-test-secret-that-is-long-enough-for-hmac");
        String token = files.verificationToken("TSC001");

        assertTrue(files.verifyToken(token, "TSC001"));
        assertFalse(files.verifyToken(token, "TSC002"));
        assertFalse(files.verifyToken(token + "x", "TSC001"));
    }

    @Test
    void rejectsPathsOutsideUploadRoot() {
        CertificateFileService files = new CertificateFileService(
                Path.of("target", "test-uploads").toString(),
                "unit-test-secret-that-is-long-enough-for-hmac");

        assertThrows(ApiException.class, () -> files.path("../../outside.txt"));
    }
}
