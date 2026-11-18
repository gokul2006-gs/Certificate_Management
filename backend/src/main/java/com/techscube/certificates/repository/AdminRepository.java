package com.techscube.certificates.repository;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.techscube.certificates.model.Admin;

public interface AdminRepository extends MongoRepository<Admin, String> {
    Optional<Admin> findByUsernameIgnoreCase(String username);
}
