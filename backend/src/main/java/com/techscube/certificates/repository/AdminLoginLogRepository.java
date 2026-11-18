package com.techscube.certificates.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.techscube.certificates.model.AdminLoginLog;

public interface AdminLoginLogRepository extends MongoRepository<AdminLoginLog, String> {}
