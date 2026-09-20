import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { Student } from "../models/Student.js";
import { Certificate } from "../models/Certificate.js";
import { env } from "../config/env.js";
import { parsePagination, paginated } from "../utils/pagination.js";
import { publicStudent } from "../utils/http.js";
import { nextStudentId } from "../utils/certificates.js";

async function hashPassword(password) {
  return bcrypt.hash(password || env.defaultStudentPassword, 10);
}

export async function listStudents(req, res) {
  const { page, pageSize, skip } = parsePagination(req.query);
  const search = String(req.query.search || req.query.q || "").trim();
  const filter = search
    ? {
        $or: [
          { studentId: new RegExp(search, "i") },
          { name: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    Student.countDocuments(filter),
  ]);
  const data = paginated(items.map(publicStudent), total, { page, pageSize });
  if (req.query.page || req.query.pageSize) {
    return res.json(data);
  }
  const all = await Student.find(filter).sort({ createdAt: -1 });
  res.json(all.map(publicStudent));
}

export async function createStudent(req, res) {
  const studentId = (req.body.student_id || (await nextStudentId())).toUpperCase();
  const exists = await Student.findOne({ $or: [{ studentId }, { email: req.body.email.toLowerCase() }] });
  if (exists) {
    return res.status(400).json({ error: "Student ID or email already exists" });
  }
  const student = await Student.create({
    studentId,
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    passwordHash: await hashPassword(req.body.password),
  });
  res.status(201).json({
    ...publicStudent(student),
    default_password: req.body.password ? undefined : env.defaultStudentPassword,
  });
}

export async function getStudent(req, res) {
  const student = await Student.findOne({ studentId: req.params.studentId.toUpperCase() });
  if (!student) return res.status(404).json({ error: "Student not found" });
  if (req.sessionUser.role === "student" && req.sessionUser.studentId !== student.studentId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  res.json(publicStudent(student));
}

export async function updateStudent(req, res) {
  const student = await Student.findOne({ studentId: req.params.studentId.toUpperCase() }).select("+passwordHash");
  if (!student) return res.status(404).json({ error: "Student not found" });
  if (req.body.name) student.name = req.body.name;
  if (req.body.email) student.email = req.body.email.toLowerCase();
  if (req.body.password) student.passwordHash = await hashPassword(req.body.password);
  await student.save();
  res.json(publicStudent(student));
}

export async function deleteStudent(req, res) {
  const student = await Student.findOneAndDelete({ studentId: req.params.studentId.toUpperCase() });
  if (!student) return res.status(404).json({ error: "Student not found" });
  await Certificate.deleteMany({ student: student._id });
  res.json({ message: "Student deleted" });
}

export async function bulkDeleteStudents(req, res) {
  const ids = req.body.student_ids.map((id) => id.toUpperCase());
  const students = await Student.find({ studentId: { $in: ids } });
  await Certificate.deleteMany({ student: { $in: students.map((s) => s._id) } });
  const result = await Student.deleteMany({ studentId: { $in: ids } });
  res.json({ deleted_count: result.deletedCount });
}

export async function importStudents(req, res) {
  if (!req.file) return res.status(400).json({ error: "Excel file is required" });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ error: "Spreadsheet is empty" });

  const headerRow = sheet.getRow(1);
  const headers = {};
  headerRow.eachCell((cell, col) => {
    headers[String(cell.value || "").trim().toLowerCase().replace(/\s+/g, "_")] = col;
  });
  const required = ["name", "email"];
  const missing = required.filter((key) => !headers[key] && !headers.student_id);
  if (!headers.name || !headers.email) {
    return res.status(400).json({ error: "Required columns: name, email. Optional: student_id, password" });
  }

  const created = [];
  const updated = [];
  const warnings = [];
  const seenIds = new Set();
  const seenEmails = new Set();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = String(row.getCell(headers.name).value || "").trim();
    const email = String(row.getCell(headers.email).value || "").trim().toLowerCase();
    const studentIdRaw = headers.student_id ? String(row.getCell(headers.student_id).value || "").trim() : "";
    const password = headers.password ? String(row.getCell(headers.password).value || "").trim() : "";
    if (!name && !email) continue;
    if (!name || !email) {
      warnings.push({ row: rowNumber, error: "Name and email are required" });
      continue;
    }
    if (seenEmails.has(email)) {
      warnings.push({ row: rowNumber, error: `Duplicate email in file: ${email}` });
      continue;
    }
    seenEmails.add(email);
    let studentId = studentIdRaw.toUpperCase() || (await nextStudentId());
    if (seenIds.has(studentId)) {
      warnings.push({ row: rowNumber, error: `Duplicate student ID in file: ${studentId}` });
      continue;
    }
    seenIds.add(studentId);

    const existing = await Student.findOne({ $or: [{ studentId }, { email }] });
    if (existing) {
      existing.name = name;
      existing.email = email;
      if (password) existing.passwordHash = await hashPassword(password);
      await existing.save();
      updated.push(publicStudent(existing));
    } else {
      const student = await Student.create({
        studentId,
        name,
        email,
        passwordHash: await hashPassword(password),
      });
      created.push(publicStudent(student));
    }
  }

  res.json({
    created_count: created.length,
    updated_count: updated.length,
    warnings,
    created,
    updated,
    default_password: env.defaultStudentPassword,
  });
  void missing;
}

export async function studentProfile(req, res) {
  const studentId = req.params.studentId.toUpperCase();
  if (req.sessionUser.role === "student" && req.sessionUser.studentId !== studentId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const student = await Student.findOne({ studentId });
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json(publicStudent(student));
}
