import crypto from "node:crypto";
import { Certificate } from "../models/Certificate.js";
import { Student } from "../models/Student.js";
import { generateQrPng } from "./qr.js";
import { saveFile, absoluteFileUrl } from "./storage.js";
import { createVerificationToken, randomNonce } from "./tokens.js";

export async function nextStudentId() {
  const last = await Student.findOne({ studentId: /^TSC\d+$/ }).sort({ studentId: -1 }).lean();
  if (!last) return "TSC001";
  const next = Number(String(last.studentId).replace("TSC", "")) + 1;
  return `TSC${String(Number.isFinite(next) ? next : 1).padStart(3, "0")}`;
}

export function serializeCertificate(cert, req, extra = {}) {
  const status = typeof cert.resolveStatus === "function" ? cert.resolveStatus() : cert.status;
  return {
    id: cert._id,
    student_id: cert.studentId,
    course_name: cert.courseName,
    issue_date: cert.issueDate,
    expires_at: cert.expiresAt,
    certificate_status: status,
    status,
    certificate: absoluteFileUrl(req, cert.certificateFileUrl),
    qr: absoluteFileUrl(req, cert.qrCodeUrl),
    verification_url: extra.verificationUrl || "",
    download_url: absoluteFileUrl(req, `/api/certificates/download/${cert.studentId}`),
    certificate_available: Boolean(cert.certificateFileUrl),
    revoked_at: cert.revokedAt,
    revoked_reason: cert.revokedReason,
  };
}

export async function issueCertificate({
  student,
  fileBuffer,
  filename,
  mime,
  courseName,
  issueDate,
  expiresAt,
  req,
}) {
  const nonce = randomNonce();
  const verificationToken = createVerificationToken(student.studentId, nonce);
  const ext = (filename || "certificate.png").split(".").pop() || "png";
  const stored = await saveFile(
    fileBuffer,
    `certificates/${student.studentId}-${Date.now()}.${ext}`,
    mime || "image/png"
  );
  const qr = await generateQrPng(student.studentId, verificationToken);

  await Certificate.updateMany(
    { student: student._id, status: "VALID" },
    { $set: { status: "REVOKED", revokedAt: new Date(), revokedReason: "Superseded by a newer certificate" } }
  );

  const certificate = await Certificate.create({
    student: student._id,
    studentId: student.studentId,
    certificateFileUrl: stored.url,
    certificateFileKey: stored.key,
    qrCodeUrl: qr.url,
    qrCodeKey: qr.key,
    verificationToken,
    courseName: courseName || "",
    issueDate: issueDate ? new Date(issueDate) : new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    status: "VALID",
  });

  return {
    certificate,
    payload: serializeCertificate(certificate, req, { verificationUrl: qr.verificationUrl }),
  };
}

export function mimeFromName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export function fileHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
