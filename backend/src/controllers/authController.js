import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";
import { Student } from "../models/Student.js";
import { AdminLoginLog } from "../models/AdminLoginLog.js";
import { setSessionCookie, clearSessionCookie, readSession } from "../middleware/auth.js";
import { clientIp } from "../utils/http.js";

export async function adminLogin(req, res) {
  const totalStart = performance.now();

  const { username, password } = req.body;
  const normalizedUsername = String(username || "").trim().toUpperCase();

  const dbStart = performance.now();
  const admin = await Admin.findOne({ username: normalizedUsername }).select("+passwordHash");
  console.log("MongoDB query:", (performance.now() - dbStart).toFixed(2), "ms");

  const passwordStart = performance.now();
  const isMatch = admin && (await bcrypt.compare(password, admin.passwordHash));
  console.log("Password compare:", (performance.now() - passwordStart).toFixed(2), "ms");

  if (!admin || !isMatch) {
    console.log("TOTAL:", (performance.now() - totalStart).toFixed(2), "ms");
    return res.status(400).json({ error: "Invalid admin credentials" });
  }

  const logStart = performance.now();
  const log = await AdminLoginLog.create({
    username: admin.username,
    ipAddress: clientIp(req),
    userAgent: req.headers["user-agent"] || "",
  });
  console.log(
    "Login log DB insert:",
    (performance.now() - logStart).toFixed(2),
    "ms"
  );

  const jwtStart = performance.now();
  setSessionCookie(res, {
    role: "admin",
    username: admin.username,
    adminId: String(admin._id),
    logId: String(log._id),
  });
  console.log("Session cookie:", (performance.now() - jwtStart).toFixed(2), "ms");

  console.log("TOTAL:", (performance.now() - totalStart).toFixed(2), "ms");
  res.json({ message: "Admin login success", role: "admin", username: admin.username });
}

export async function studentLogin(req, res) {
  const totalStart = performance.now();
  const studentId = String(req.body.student_id).trim().toUpperCase();

  const dbStart = performance.now();
  const student = await Student.findOne({ studentId }).select("+passwordHash");
  console.log("MongoDB query:", (performance.now() - dbStart).toFixed(2), "ms");

  if (!student) {
    console.log("TOTAL:", (performance.now() - totalStart).toFixed(2), "ms");
    return res.status(400).json({ error: "Student not found" });
  }

  const passwordStart = performance.now();
  const isMatch = await bcrypt.compare(req.body.password, student.passwordHash);
  console.log("Password compare:", (performance.now() - passwordStart).toFixed(2), "ms");

  if (!isMatch) {
    console.log("TOTAL:", (performance.now() - totalStart).toFixed(2), "ms");
    return res.status(400).json({ error: "Invalid password" });
  }

  const jwtStart = performance.now();
  setSessionCookie(res, {
    role: "student",
    studentId: student.studentId,
    studentMongoId: String(student._id),
  });
  console.log("JWT generation:", (performance.now() - jwtStart).toFixed(2), "ms");

  console.log("TOTAL:", (performance.now() - totalStart).toFixed(2), "ms");
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
