package com.techscube.certificates.service;

import com.techscube.certificates.dto.ApiDtos.StudentRequest;
import com.techscube.certificates.model.Student;
import com.techscube.certificates.repository.StudentRepository;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class StudentImportService {
    private final StudentRepository students;
    private final StudentService studentService;
    private final PasswordEncoder passwords;
    private final ApiMapper mapper;
    private final String defaultPassword;

    public StudentImportService(
            StudentRepository students,
            StudentService studentService,
            PasswordEncoder passwords,
            ApiMapper mapper,
            AuthService authService) {
        this.students = students;
        this.studentService = studentService;
        this.passwords = passwords;
        this.mapper = mapper;
        this.defaultPassword = authService.defaultStudentPassword();
    }

    public Map<String, Object> importWorkbook(InputStream input) throws Exception {
        var workbook = WorkbookFactory.create(input);
        try (workbook) {
            var sheet = workbook.getNumberOfSheets() == 0 ? null : workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new IllegalArgumentException("Spreadsheet is empty");
            }
            DataFormatter formatter = new DataFormatter();
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            Map<String, Integer> columns = new LinkedHashMap<>();
            for (var cell : headerRow) {
                String key = formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", "_");
                columns.put(key, cell.getColumnIndex());
            }
            if (!columns.containsKey("name") || !columns.containsKey("email")) {
                throw new IllegalArgumentException("Required columns: name, email. Optional: student_id, password");
            }
            List<Map<String, Object>> created = new ArrayList<>();
            List<Map<String, Object>> updated = new ArrayList<>();
            List<Map<String, Object>> warnings = new ArrayList<>();
            Set<String> seenIds = new HashSet<>();
            Set<String> seenEmails = new HashSet<>();

            for (int rowIndex = headerRow.getRowNum() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;
                String name = cell(formatter, row, columns.get("name")).trim();
                String email = cell(formatter, row, columns.get("email")).trim().toLowerCase(Locale.ROOT);
                String id = cell(formatter, row, columns.get("student_id")).trim().toUpperCase(Locale.ROOT);
                String password = cell(formatter, row, columns.get("password")).trim();
                if (name.isBlank() && email.isBlank()) continue;
                if (name.isBlank() || email.isBlank()) {
                    warnings.add(Map.of("row", rowIndex + 1, "error", "Name and email are required"));
                    continue;
                }
                if (!seenEmails.add(email)) {
                    warnings.add(Map.of("row", rowIndex + 1, "error", "Duplicate email in file: " + email));
                    continue;
                }
                if (id.isBlank()) id = studentService.nextStudentId();
                if (!seenIds.add(id)) {
                    warnings.add(Map.of("row", rowIndex + 1, "error", "Duplicate student ID in file: " + id));
                    continue;
                }
                Student existing = students.findByStudentIdIgnoreCase(id)
                        .or(() -> students.findByEmailIgnoreCase(email)).orElse(null);
                Instant now = Instant.now();
                if (existing != null) {
                    existing.setName(name);
                    existing.setEmail(email);
                    if (!password.isBlank()) existing.setPasswordHash(passwords.encode(password));
                    existing.setUpdatedAt(now);
                    updated.add(mapper.student(students.save(existing)));
                } else {
                    Student student = new Student(null, id, name, email,
                            passwords.encode(password.isBlank() ? defaultPassword : password), now, now);
                    created.add(mapper.student(students.save(student)));
                }
            }
            return Map.of("created_count", created.size(), "updated_count", updated.size(),
                    "warnings", warnings, "created", created, "updated", updated, "default_password", defaultPassword);
        }
    }

    private String cell(DataFormatter formatter, Row row, Integer column) {
        return column == null || row.getCell(column) == null ? "" : formatter.formatCellValue(row.getCell(column));
    }
}
