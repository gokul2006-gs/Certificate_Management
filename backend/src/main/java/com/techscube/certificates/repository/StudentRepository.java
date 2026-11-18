package com.techscube.certificates.repository;

import java.util.Optional;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import com.techscube.certificates.model.Student;

public interface StudentRepository extends MongoRepository<Student, String> {
    Optional<Student> findByStudentIdIgnoreCase(String studentId);
    boolean existsByStudentIdIgnoreCase(String studentId);
    boolean existsByEmailIgnoreCase(String email);
    Optional<Student> findByEmailIgnoreCase(String email);
    List<Student> findByStudentIdIn(List<String> studentIds);
    Optional<Student> findFirstByStudentIdStartingWithOrderByStudentIdDesc(String prefix);
    @Query(value = "{'$or':[{'studentId':?0},{'email':?1}]}", exists = true)
    boolean existsByStudentIdOrEmail(String studentId, String email);
}
