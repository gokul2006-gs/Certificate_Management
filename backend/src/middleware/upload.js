import multer from "multer";
import { env } from "../config/env.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024, files: 50 },
});
