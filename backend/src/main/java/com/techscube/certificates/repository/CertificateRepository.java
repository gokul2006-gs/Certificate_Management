package com.techscube.certificates.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Collection;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import com.techscube.certificates.model.Certificate;

public interface CertificateRepository extends MongoRepository<Certificate, String> {
    long countByStatusNot(String status);
    Optional<Certificate> findFirstByStudentIdIgnoreCaseOrderByCreatedAtDesc(String studentId);
    List<Certificate> findByStatusNotOrderByStudentIdAsc(String status);
    long countByStatusAndExpiresAtAfterAndExpiresAtLessThanEqual(String status, Instant start, Instant end);
    List<Certificate> findTop4ByStatusAndExpiresAtAfterAndExpiresAtLessThanEqualOrderByExpiresAtAsc(
            String status, Instant start, Instant end);
    List<Certificate> findByStudentIdRegexOrCourseNameRegex(String studentId, String courseName);
    @Query(value = "{'issueDate': {'$gte': ?0}}", fields = "{'issueDate': 1}")
    List<Certificate> findIssuedAfter(Instant start);
    List<Certificate> findByStudentIdIgnoreCaseOrderByCreatedAtDesc(String studentId);
    List<Certificate> findByStatusAndExpiresAtGreaterThanEqualAndExpiresAtLessThanEqualAndExpiryNotificationSentAtIsNull(
            String status, Instant start, Instant end);
    void deleteAllByStudent(String studentId);
    void deleteAllByStudentIn(Collection<String> studentIds);
}
