import path from "node:path";
import fs from "node:fs";
import archiver from "archiver";
import { Student } from "../models/Student.js";
import { Certificate } from "../models/Certificate.js";
import { CertificateView } from "../models/CertificateView.js";
import { CertificateGenerationJob } from "../models/CertificateGenerationJob.js";
import { parsePagination, paginated } from "../utils/pagination.js";
import { issueCertificate, mimeFromName, serializeCertificate } from "../utils/certificates.js";
import { renderCertificateImage, formatIssueRange } from "../utils/certificateImage.js";
import { isAllowedCertificateName, safeZipEntries, studentIdFromFilename } from "../utils/files.js";
import { saveFile, absoluteFileUrl } from "../utils/storage.js";
import { verifyVerificationToken, verificationUrl } from "../utils/tokens.js";
import { enqueueGeneration } from "../jobs/queue.js";
import { serializeJob } from "../services/generationJob.js";
import { clientIp } from "../utils/http.js";

function parseFields(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function latestCertificate(studentId) {
  return Certificate.findOne({ studentId: studentId.toUpperCase() }).sort({ createdAt: -1 });
}

export async function listCertificates(req, res) {
  const { page, pageSize, skip } = parsePagination(req.query);
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();
  const filter = {};
  if (search) {
    filter.$or = [
      { studentId: new RegExp(search, "i") },
      { courseName: new RegExp(search, "i") },
    ];
  }
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Certificate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    Certificate.countDocuments(filter),
  ]);
  res.json(
    paginated(
      items.map((item) => serializeCertificate(item, req, { verificationUrl: verificationUrl(item.studentId, item.verificationToken) })),
      total,
      { page, pageSize }
    )
  );
}

export async function uploadCertificate(req, res) {
  const studentId = String(req.body.student_id || "").trim().toUpperCase();
  const student = await Student.findOne({ studentId });
  if (!student) return res.status(400).json({ error: "Student not found" });
  if (!req.file) return res.status(400).json({ error: "Certificate file is required" });
  if (!isAllowedCertificateName(req.file.originalname) && !isAllowedCertificateName(req.file.originalname + ".png")) {
    return res.status(400).json({ error: "Allowed types: PDF, JPG, JPEG, PNG" });
  }

  const fields = parseFields(req.body.fields);
  const courseName = req.body.course_name || "";
  const issueLabel = formatIssueRange(req.body.start_date, req.body.end_date, new Date().toISOString().slice(0, 10));
  let buffer = req.file.buffer;
  let filename = req.file.originalname;
  let mime = req.file.mimetype;
  if (fields && /\.(png|jpe?g)$/i.test(filename)) {
    buffer = await renderCertificateImage(buffer, {
      name: student.name,
      courseName,
      issueDate: issueLabel,
      fields,
    });
    filename = `${student.studentId}.png`;
    mime = "image/png";
  }

  const issued = await issueCertificate({
    student,
    fileBuffer: buffer,
    filename,
    mime,
    courseName,
    issueDate: req.body.start_date || new Date(),
    expiresAt: req.body.expires_at || null,
    req,
  });
  res.status(201).json(issued.payload);
}

export async function bulkUploadCertificates(req, res) {
  const files = [...(req.files?.certificate_files || [])];
  const zip = req.files?.zip_file?.[0];
  if (zip) {
    files.push(...safeZipEntries(zip.buffer).map((entry) => ({
      originalname: entry.name,
      buffer: entry.buffer,
      mimetype: mimeFromName(entry.name),
    })));
  }
  if (!files.length) return res.status(400).json({ error: "No certificate files supplied" });

  const created = [];
  const skipped = [];
  for (const file of files) {
    if (!isAllowedCertificateName(file.originalname)) {
      skipped.push({ file: file.originalname, reason: "Unsupported file type" });
      continue;
    }
    const studentId = studentIdFromFilename(file.originalname);
    if (!studentId) {
      skipped.push({ file: file.originalname, reason: "Could not read student ID from filename" });
      continue;
    }
    const student = await Student.findOne({ studentId });
    if (!student) {
      skipped.push({ file: file.originalname, student_id: studentId, reason: "Student not found" });
      continue;
    }
    try {
      const issued = await issueCertificate({
        student,
        fileBuffer: file.buffer,
        filename: file.originalname,
        mime: file.mimetype,
        courseName: req.body.course_name || "",
        issueDate: new Date(),
        expiresAt: req.body.expires_at || null,
        req,
      });
      created.push({
        student_id: student.studentId,
        student_name: student.name,
        file: file.originalname,
        ...issued.payload,
      });
    } catch (err) {
      skipped.push({ file: file.originalname, student_id: studentId, reason: err.message });
    }
  }

  res.json({ created_count: created.length, skipped_count: skipped.length, created, skipped });
}

export async function createGenerationJob(req, res) {
  if (!req.file) return res.status(400).json({ error: "Template file is required" });
  if (!/\.(png|jpe?g)$/i.test(req.file.originalname)) {
    return res.status(400).json({ error: "Template must be JPG or PNG" });
  }
  const students = await Student.find().sort({ studentId: 1 });
  if (!students.length) return res.status(400).json({ error: "Upload students first" });
  const stored = await saveFile(req.file.buffer, `templates/${Date.now()}-${req.file.originalname}`, req.file.mimetype);
  const job = await CertificateGenerationJob.create({
    status: "pending",
    templateFileUrl: stored.url,
    templateFileKey: stored.key,
    studentIds: students.map((s) => s.studentId),
    fields: parseFields(req.body.fields) || {},
    courseName: req.body.course_name || "",
    issueDate: req.body.issue_date || new Date().toISOString().slice(0, 10),
    startDate: req.body.start_date || "",
    endDate: req.body.end_date || "",
    expiresAt: req.body.expires_at || null,
  });
  const mode = await enqueueGeneration(String(job._id));
  res.status(201).json({ ...serializeJob(job), queue: mode });
}

export async function pollGenerationJob(req, res) {
  const job = await CertificateGenerationJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(serializeJob(job));
}

export async function cancelGenerationJob(req, res) {
  const job = await CertificateGenerationJob.findById(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  job.cancelRequested = true;
  if (["pending", "processing"].includes(job.status)) {
    job.status = "cancelled";
    job.completedAt = new Date();
  }
  await job.save();
  res.json(serializeJob(job));
}

export async function verifyCertificate(req, res) {
  const studentId = req.params.studentId.toUpperCase();
  const token = String(req.query.token || req.headers["x-verification-token"] || "");
  const certificate = await latestCertificate(studentId);
  const student = await Student.findOne({ studentId });

  if (!student || !certificate) {
    return res.status(404).json({
      valid: false,
      status: "INVALID",
      certificate_status: "INVALID",
      error: "Certificate not found",
    });
  }

  const resolved = certificate.resolveStatus();
  const tokenOk = token
    ? verifyVerificationToken(token, studentId) && token === certificate.verificationToken
    : false;
  const valid = resolved === "VALID" && (tokenOk || !token);

  res.json({
    valid,
    certificate_status: token && !tokenOk ? "INVALID" : resolved,
    student_id: student.studentId,
    student_name: student.name,
    course_name: certificate.courseName,
    issue_date: certificate.issueDate,
    expires_at: certificate.expiresAt,
    certificate: absoluteFileUrl(req, certificate.certificateFileUrl),
    download_url: absoluteFileUrl(req, `/api/certificates/download/${student.studentId}`),
    certificate_available: Boolean(certificate.certificateFileUrl),
    token_valid: token ? tokenOk : null,
  });
}

export async function viewCertificate(req, res) {
  const studentId = req.params.studentId.toUpperCase();
  if (req.sessionUser.role === "student" && req.sessionUser.studentId !== studentId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const student = await Student.findOne({ studentId });
  const certificate = await latestCertificate(studentId);
  if (!student) {
    return res.status(404).json({ status: "PENDING", error: "Student not found" });
  }
  if (!certificate) {
    return res.json({
      status: "PENDING",
      student_id: student.studentId,
      student_name: student.name,
      certificate_available: false,
    });
  }
  if (req.sessionUser.role === "student") {
    await CertificateView.findOneAndUpdate(
      { certificate: certificate._id, student: student._id },
      { viewedAt: new Date(), ipAddress: clientIp(req), userAgent: req.headers["user-agent"] || "" },
      { upsert: true, new: true }
    );
  }
  res.json({
    ...serializeCertificate(certificate, req, {
      verificationUrl: verificationUrl(certificate.studentId, certificate.verificationToken),
    }),
    status: certificate.resolveStatus(),
  });
}

export async function downloadCertificate(req, res) {
  const studentId = req.params.studentId.toUpperCase();
  const session = req.sessionUser;
  if (session && session.role === "student" && session.studentId !== studentId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const certificate = await latestCertificate(studentId);
  if (!certificate?.certificateFileUrl) return res.status(404).json({ error: "Certificate file not available" });
  if (certificate.resolveStatus() === "REVOKED") {
    return res.status(410).json({ error: "Certificate has been revoked" });
  }
  const url = absoluteFileUrl(req, certificate.certificateFileUrl);
  if (url.startsWith("http") && !certificate.certificateFileUrl.startsWith("/api/files/")) {
    return res.redirect(url);
  }
  const key = certificate.certificateFileKey || certificate.certificateFileUrl.replace("/api/files/", "");
  const { env } = await import("../config/env.js");
  const full = path.join(env.uploadRoot, key);
  if (!fs.existsSync(full)) return res.status(404).json({ error: "Certificate file not available" });
  res.download(full, `${studentId}-certificate${path.extname(full) || ".png"}`);
}

export async function downloadAllCertificates(req, res) {
  const certificates = await Certificate.find({ status: { $ne: "REVOKED" } }).sort({ studentId: 1 });
  if (!certificates.length) return res.status(404).json({ error: "No certificates to download" });
  const { env } = await import("../config/env.js");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=all_certificates.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    throw err;
  });
  archive.pipe(res);
  for (const cert of certificates) {
    if (!cert.certificateFileUrl?.startsWith("/api/files/")) continue;
    const key = cert.certificateFileKey || cert.certificateFileUrl.replace("/api/files/", "");
    const full = path.join(env.uploadRoot, key);
    if (fs.existsSync(full)) {
      archive.file(full, { name: `${cert.studentId}${path.extname(full) || ".png"}` });
    }
  }
  await archive.finalize();
}

export async function certificateViews(req, res) {
  const studentId = req.params.studentId.toUpperCase();
  const certificate = await latestCertificate(studentId);
  if (!certificate) return res.status(404).json({ error: "Certificate not found" });
  const views = await CertificateView.find({ certificate: certificate._id }).sort({ viewedAt: -1 });
  res.json(
    views.map((view) => ({
      viewed_at: view.viewedAt,
      ip_address: view.ipAddress,
      user_agent: view.userAgent,
    }))
  );
}

export async function revokeCertificate(req, res) {
  const certificate = await Certificate.findById(req.params.id);
  if (!certificate) return res.status(404).json({ error: "Certificate not found" });
  certificate.status = "REVOKED";
  certificate.revokedAt = new Date();
  certificate.revokedReason = req.body.reason || "Revoked by administrator";
  await certificate.save();
  res.json(serializeCertificate(certificate, req, {
    verificationUrl: verificationUrl(certificate.studentId, certificate.verificationToken),
  }));
}
