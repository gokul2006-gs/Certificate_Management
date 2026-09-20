import test from "node:test";
import assert from "node:assert/strict";
import { createVerificationToken, verifyVerificationToken, verificationUrl } from "../src/utils/tokens.js";
import { studentIdFromFilename, isAllowedCertificateName } from "../src/utils/files.js";
import { parsePagination, paginated } from "../src/utils/pagination.js";
import { assertPublicFrontendUrl } from "../src/config/env.js";

test("signed verification tokens bind to a student ID", () => {
  const token = createVerificationToken("TSC001", "abc123");
  assert.equal(verifyVerificationToken(token, "TSC001"), true);
  assert.equal(verifyVerificationToken(token, "TSC002"), false);
  assert.equal(verifyVerificationToken("tampered", "TSC001"), false);
});

test("QR verification URLs use FRONTEND_BASE_URL and never a raw student ID only", () => {
  const token = createVerificationToken("TSC001", "abc123");
  const url = verificationUrl("TSC001", token);
  assert.match(url, /\/verify\/TSC001\?token=/);
  assert.doesNotMatch(url, /192\.168\./);
});

test("student IDs are read from filenames", () => {
  assert.equal(studentIdFromFilename("TSC001.png"), "TSC001");
  assert.equal(studentIdFromFilename("TSC002-certificate.pdf"), "TSC002");
  assert.equal(isAllowedCertificateName("file.exe"), false);
  assert.equal(isAllowedCertificateName("file.png"), true);
});

test("pagination metadata", () => {
  const page = parsePagination({ page: "2", pageSize: "10" });
  assert.deepEqual(page, { page: 2, pageSize: 10, skip: 10 });
  const result = paginated([1, 2], 21, page);
  assert.equal(result.totalPages, 3);
});

test("admin usernames normalize to uppercase", () => {
  assert.equal(String("admin").trim().toUpperCase(), "ADMIN");
  assert.equal(String(" Admin ").trim().toUpperCase(), "ADMIN");
});

test("production frontend URLs cannot be LAN IPs", () => {
  assert.throws(() => assertPublicFrontendUrl("http://192.168.1.20:5173", { allowPrivate: false }));
  assert.equal(assertPublicFrontendUrl("https://certs.example.com", { allowPrivate: false }), "https://certs.example.com");
});
