import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";
import { Student } from "../models/Student.js";
import { AdminLoginLog } from "../models/AdminLoginLog.js";
import { setSessionCookie, clearSessionCookie, readSession } from "../middleware/auth.js";
import { clientIp } from "../utils/http.js";

export async function adminLogin(req, res) {
  const { username, password } = req.body;
  const normalizedUsername = String(username || "").trim().toUpperCase();
  const admin = await Admin.findOne({ username: normalizedUsername }).select("+passwordHash");
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(400).json({ error: "Invalid admin credentials" });
  }
  const log = await AdminLoginLog.create({
    username: admin.username,
    ipAddress: clientIp(req),
    userAgent: req.headers["user-agent"] || "",
  });
  setSessionCookie(res, {
    role: "admin",
    username: admin.username,
    adminId: String(admin._id),
    logId: String(log._id),
  });
  res.json({ message: "Admin login success", role: "admin", username: admin.username });
}

export async function studentLogin(req, res) {
  const studentId = String(req.body.student_id).trim().toUpperCase();
  const student = await Student.findOne({ studentId }).select("+passwordHash");
  if (!student) return res.status(400).json({ error: "Student not found" });
  if (!(await bcrypt.compare(req.body.password, student.passwordHash))) {
    return res.status(400).json({ error: "Invalid password" });
  }
  setSessionCookie(res, {
    role: "student",
    studentId: student.studentId,
    studentMongoId: String(student._id),
  });
  res.json({
    message: "Student login success",
    role: "student",
    student_id: student.studentId,
    name: student.name,
  });
}

export async function logout(req, res) {
  const session = readSession(req);
  if (session?.logId) {
    await AdminLoginLog.findByIdAndUpdate(session.logId, { logoutAt: new Date() });
  }
  clearSessionCookie(res);
  res.json({ message: "Logged out" });
}

export async function session(req, res) {
  const current = readSession(req);
  if (!current) {
    return res.json({ authenticated: false, role: null, student_id: null, is_admin: false });
  }
  if (current.role === "admin") {
    return res.json({
      authenticated: true,
      role: "admin",
      student_id: null,
      is_admin: true,
      username: current.username,
    });
  }
  return res.json({
    authenticated: true,
    role: "student",
    student_id: current.studentId,
    is_admin: false,
  });
}
