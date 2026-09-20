import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/i;

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function buildCorsOrigins(primary) {
  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://certificate-management-phi.vercel.app",
    "https://certificate-management-ravg.onrender.com",
    "https://certificate-management-1.onrender.com",
  ];
  const origins = new Set([...defaults, ...parseOrigins(primary)]);
  return [...origins];
}

export function assertPublicFrontendUrl(url, { allowPrivate = true } = {}) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("FRONTEND_BASE_URL must use http or https");
  }
  if (!allowPrivate && PRIVATE_HOST.test(parsed.hostname)) {
    throw new Error("FRONTEND_BASE_URL must not be a LAN or loopback address in production");
  }
  return parsed.origin;
}

const nodeEnv = process.env.NODE_ENV || "development";
const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || "http://localhost:5173").replace(/\/+$/, "");

if (nodeEnv === "production") {
  assertPublicFrontendUrl(frontendBaseUrl, { allowPrivate: false });
} else {
  assertPublicFrontendUrl(frontendBaseUrl, { allowPrivate: true });
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_certificate_db",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  frontendBaseUrl,
  apiPublicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, ""),
  corsOrigins: buildCorsOrigins(process.env.CORS_ORIGIN || frontendBaseUrl),
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 20),
  storageProvider: (process.env.STORAGE_PROVIDER || "local").toLowerCase(),
  cookieName: process.env.COOKIE_NAME || "sc_session",
  redisUrl: process.env.REDIS_URL || "",
  adminUsername: String(process.env.ADMIN_USERNAME || "admin").trim().toUpperCase(),
  adminEmail: process.env.ADMIN_EMAIL || "admin@techscube.local",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123",
  defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD || "Tech@123",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  s3: {
    bucket: process.env.S3_BUCKET || "",
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    endpoint: process.env.S3_ENDPOINT || "",
    publicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  },
  uploadRoot: path.resolve(__dirname, "../../uploads"),
};

export function cookieOptions() {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
