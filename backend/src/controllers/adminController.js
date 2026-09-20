import { Student } from "../models/Student.js";
import { Course } from "../models/Course.js";
import { Certificate } from "../models/Certificate.js";
import { AdminLoginLog } from "../models/AdminLoginLog.js";
import { pingDb } from "../config/db.js";
import { parsePagination, paginated } from "../utils/pagination.js";

export async function dashboardStats(_req, res) {
  const [students, courses, certificates] = await Promise.all([
    Student.countDocuments(),
    Course.countDocuments(),
    Certificate.countDocuments(),
  ]);
  res.json({ students, courses, certificates });
}

export async function loginLogs(req, res) {
  const { page, pageSize, skip } = parsePagination(req.query, { defaultPageSize: 25 });
  const [items, total] = await Promise.all([
    AdminLoginLog.find().sort({ loginAt: -1 }).skip(skip).limit(pageSize),
    AdminLoginLog.countDocuments(),
  ]);
  const mapped = items.map((log) => ({
    id: log._id,
    username: log.username,
    login_at: log.loginAt,
    logout_at: log.logoutAt,
    ip_address: log.ipAddress,
  }));
  if (req.query.page || req.query.pageSize) {
    return res.json(paginated(mapped, total, { page, pageSize }));
  }
  res.json(mapped);
}

export async function databaseStatus(_req, res) {
  try {
    const result = await pingDb();
    res.json(result);
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
}
