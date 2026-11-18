package com.techscube.certificates.service;

import com.techscube.certificates.dto.ApiDtos.CourseRequest;
import com.techscube.certificates.exception.ApiException;
import com.techscube.certificates.model.Course;
import com.techscube.certificates.repository.CourseRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CourseService {
    private static final List<String> TYPES = List.of("Technical", "Basic", "Non-Technical", "Graphic Designing", "Development Services");
    private final CourseRepository courses;
    private final MongoTemplate mongo;
    private final ApiMapper mapper;

    public CourseService(CourseRepository courses, MongoTemplate mongo, ApiMapper mapper) {
        this.courses = courses;
        this.mongo = mongo;
        this.mapper = mapper;
    }

    public Map<String, Object> list(String search, int page, int pageSize, boolean paginated) {
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("courseName").regex(pattern),
                    Criteria.where("duration").regex(pattern),
                    Criteria.where("courseType").regex(pattern)));
        }
        long total = mongo.count(query, Course.class);
        query.with(Sort.by(Sort.Direction.ASC, "courseName"));
        if (paginated) query.skip((long) (page - 1) * pageSize).limit(pageSize);
        List<Map<String, Object>> items = mongo.find(query, Course.class).stream().map(mapper::course).toList();
        if (!paginated) return Map.of("items", items);
        return Map.of("items", items, "total", total, "page", page, "pageSize", pageSize,
                "totalPages", (int) Math.ceil((double) total / pageSize));
    }

    public Map<String, Object> create(CourseRequest request) {
        String type = request.courseType() == null || request.courseType().isBlank() ? "Technical" : request.courseType().trim();
        if (!TYPES.contains(type)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported course type");
        Instant now = Instant.now();
        return mapper.course(courses.save(new Course(null, request.courseName().trim(), request.duration().trim(), type, now, now)));
    }

    public Map<String, Object> update(String id, CourseRequest request) {
        Course course = courses.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        if (request.courseName() != null && !request.courseName().isBlank()) course.setCourseName(request.courseName().trim());
        if (request.duration() != null && !request.duration().isBlank()) course.setDuration(request.duration().trim());
        if (request.courseType() != null && !request.courseType().isBlank()) {
            if (!TYPES.contains(request.courseType())) throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported course type");
            course.setCourseType(request.courseType());
        }
        course.setUpdatedAt(Instant.now());
        return mapper.course(courses.save(course));
    }

    public void delete(String id) {
        Course course = courses.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        courses.delete(course);
    }
}
