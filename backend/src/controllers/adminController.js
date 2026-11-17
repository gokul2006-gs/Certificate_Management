import { Student } from "../models/Student.js";
import { Course } from "../models/Course.js";
import { Certificate } from "../models/Certificate.js";
import { AdminLoginLog } from "../models/AdminLoginLog.js";
import { pingDb } from "../config/db.js";
import { parsePagination, paginated } from "../utils/pagination.js";

export async function dashboardStats(req, res) {
  const now = new Date();
  const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activityStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [students, courses, certificates, expiringSoon, expiringCertificates, certificateActivity] = await Promise.all([
    Student.countDocuments(),
    Course.countDocuments(),
    Certificate.countDocuments(),
    Certificate.countDocuments({
      status: "VALID",
      expiresAt: { $gt: now, $lte: expiryLimit },
    }),
    Certificate.find({
      status: "VALID",
      expiresAt: { $gt: now, $lte: expiryLimit },
    })
      .select("studentId courseName issueDate expiresAt status")
      .populate("student", "name")
      .sort({ expiresAt: 1 })
      .limit(4),
    Certificate.aggregate([
      { $match: { issueDate: { $gte: activityStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$issueDate", timezone: "UTC" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: "$_id", count: 1 } },
    ]),
  ]);
  res.json({
    students,
    courses,
    certificates,
    expiringSoon,
    expiringCertificates: expiringCertificates.map((certificate) => ({
      id: certificate._id,
      student_id: certificate.studentId,
      student_name: certificate.student?.name || "",
      course_name: certificate.courseName,
      expires_at: certificate.expiresAt,
    })),
    certificateActivity,
  });
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
