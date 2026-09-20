import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { studentRouter } from "./routes/students.js";
import { courseRouter } from "./routes/courses.js";
import { certificateRouter } from "./routes/certificates.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { isLocalStorage } from "./utils/storage.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
        if (origin.includes("onrender.com")) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-verification-token"],
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, storage: env.storageProvider });
  });

  if (isLocalStorage()) {
    app.use("/api/files", express.static(env.uploadRoot));
  }

  app.use("/api/auth/admin/login", authLimiter);
  app.use("/api/auth/student/login", authLimiter);
  app.use("/api/auth", authRouter);
  app.use("/api/students", studentRouter);
  app.use("/api/courses", courseRouter);
  app.use("/api/certificates", certificateRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
