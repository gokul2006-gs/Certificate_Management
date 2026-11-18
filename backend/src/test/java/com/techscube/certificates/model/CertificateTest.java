package com.techscube.certificates.model;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class CertificateTest {
    @Test
    void expiryOverridesStoredValidStatusButRevocationRemainsFinal() {
        Certificate certificate = new Certificate();
        certificate.setStatus("VALID");
        certificate.setExpiresAt(Instant.now().minusSeconds(1));
        assertEquals("EXPIRED", certificate.resolvedStatus());

        certificate.setStatus("REVOKED");
        assertEquals("REVOKED", certificate.resolvedStatus());
    }

    @Test
    void certificatesWithoutExpiryRemainValid() {
        Certificate certificate = new Certificate();
        certificate.setStatus("VALID");
        assertEquals("VALID", certificate.resolvedStatus());
    }
}
