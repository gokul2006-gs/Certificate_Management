package com.techscube.certificates.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.techscube.certificates.model.Course;

public interface CourseRepository extends MongoRepository<Course, String> {}
