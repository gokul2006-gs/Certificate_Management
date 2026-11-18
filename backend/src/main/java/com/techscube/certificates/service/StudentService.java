package com.techscube.certificates.service;

import com.techscube.certificates.dto.ApiDtos.StudentRequest;
import com.techscube.certificates.dto.ApiDtos.StudentUpdateRequest;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.model.Certificate;
import com.techscube.certificates.model.Student;
import com.techscube.certificates.repository.CertificateRepository;
import com.techscube.certificates.repository.StudentRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class StudentService {
    private final StudentRepository students;
    private final CertificateRepository certificates;
    private final MongoTemplate mongo;
    private final PasswordEncoder passwords;
    private final ApiMapper mapper;
    private final String defaultPassword;

    public StudentService(
            StudentRepository students,
            CertificateRepository certificates,
            MongoTemplate mongo,
            PasswordEncoder passwords,
            ApiMapper mapper,
            @Value("${app.default-student-password}") String defaultPassword) {
        this.students = students;
        this.certificates = certificates;
        this.mongo = mongo;
        this.passwords = passwords;
        this.mapper = mapper;
        this.defaultPassword = defaultPassword;
    }

    public Map<String, Object> list(String search, int page, int pageSize, boolean paginated) {
        Query query = searchQuery(search);
        long total = mongo.count(query, Student.class);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (paginated) query.skip((long) (page - 1) * pageSize).limit(pageSize);
        List<Map<String, Object>> items = mongo.find(query, Student.class).stream().map(mapper::student).toList();
        if (!paginated) return Map.of("items", items);
        return Map.of("items", items, "total", total, "page", page, "pageSize", pageSize,
                "totalPages", (int) Math.ceil((double) total / pageSize));
    }

    public Map<String, Object> create(StudentRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String studentId = request.studentId() == null || request.studentId().isBlank()
                ? nextStudentId()
                : request.studentId().trim().toUpperCase(Locale.ROOT);
        if (students.existsByStudentIdOrEmail(studentId, email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Student ID or email already exists");
        }
        Instant now = Instant.now();
        Student student = new Student(null, studentId, request.name().trim(), email,
                passwords.encode(request.password() == null || request.password().isBlank() ? defaultPassword : request.password()),
                now, now);
        Student saved = students.save(student);
        Map<String, Object> response = mapper.student(saved);
        if (request.password() == null || request.password().isBlank()) response.put("default_password", defaultPassword);
        return response;
    }

    public Student requireStudent(String studentId) {
        return students.findByStudentIdIgnoreCase(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    public Map<String, Object> get(String studentId, String callerRole, String callerStudentId) {
        Student student = requireStudent(studentId);
        authorizeStudent(callerRole, callerStudentId, student.getStudentId());
        return mapper.student(student);
    }

    public Map<String, Object> update(String studentId, StudentUpdateRequest request) {
        Student student = requireStudent(studentId);
        if (request.name() != null && !request.name().isBlank()) student.setName(request.name().trim());
        if (request.email() != null && !request.email().isBlank()) {
            String email = request.email().trim().toLowerCase(Locale.ROOT);
            if (!email.equalsIgnoreCase(student.getEmail()) && students.existsByEmailIgnoreCase(email)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Email already exists");
            }
            student.setEmail(email);
        }
        if (request.password() != null && !request.password().isBlank()) student.setPasswordHash(passwords.encode(request.password()));
        student.setUpdatedAt(Instant.now());
        return mapper.student(students.save(student));
    }

    public void delete(String studentId) {
        Student student = requireStudent(studentId);
        certificates.deleteAllByStudent(student.getId());
        students.delete(student);
    }

    public long bulkDelete(List<String> studentIds) {
        List<String> normalized = studentIds.stream().map(id -> id.toUpperCase(Locale.ROOT)).toList();
        List<Student> found = students.findByStudentIdIn(normalized);
        certificates.deleteAllByStudentIn(found.stream().map(Student::getId).toList());
        students.deleteAll(found);
        return found.size();
    }

    public String nextStudentId() {
        long next = students.findFirstByStudentIdStartingWithOrderByStudentIdDesc("TSC")
                .map(Student::getStudentId)
                .filter(id -> id.matches("TSC\\d+"))
                .map(id -> Long.parseLong(id.substring(3)))
                .orElse(0L) + 1;
        return "TSC" + String.format(Locale.ROOT, "%03d", next);
    }

    public void authorizeStudent(String role, String callerStudentId, String targetStudentId) {
        if ("student".equals(role) && !targetStudentId.equalsIgnoreCase(callerStudentId == null ? "" : callerStudentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not authorized");
        }
    }

    private Query searchQuery(String search) {
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("studentId").regex(pattern),
                    Criteria.where("name").regex(pattern),
                    Criteria.where("email").regex(pattern)));
        }
        return query;
    }
}
