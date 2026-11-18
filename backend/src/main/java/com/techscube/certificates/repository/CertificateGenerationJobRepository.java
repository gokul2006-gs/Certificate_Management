package com.techscube.certificates.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.techscube.certificates.model.CertificateGenerationJob;

public interface CertificateGenerationJobRepository extends MongoRepository<CertificateGenerationJob, String> {}
