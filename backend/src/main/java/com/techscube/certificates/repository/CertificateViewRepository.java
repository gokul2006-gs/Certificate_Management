package com.techscube.certificates.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.techscube.certificates.model.CertificateView;

public interface CertificateViewRepository extends MongoRepository<CertificateView, String> {
    Optional<CertificateView> findByCertificateAndStudent(String certificate, String student);
    List<CertificateView> findByCertificateOrderByViewedAtDesc(String certificate);
}
