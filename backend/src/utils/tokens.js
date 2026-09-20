import crypto from "node:crypto";
import { env } from "../config/env.js";

export function createVerificationToken(studentId, certificateNonce) {
  const payload = `${String(studentId).toUpperCase()}.${certificateNonce}`;
  const signature = crypto.createHmac("sha256", env.jwtSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyVerificationToken(token, expectedStudentId) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [studentId, nonce, signature] = parts;
  if (expectedStudentId && studentId !== String(expectedStudentId).toUpperCase()) return false;
  const expected = crypto.createHmac("sha256", env.jwtSecret).update(`${studentId}.${nonce}`).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function randomNonce() {
  return crypto.randomBytes(12).toString("hex");
}

export function verificationUrl(studentId, token) {
  const base = env.frontendBaseUrl.replace(/\/+$/, "");
  return `${base}/verify/${encodeURIComponent(String(studentId).toUpperCase())}?token=${encodeURIComponent(token)}`;
}
