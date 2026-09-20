import { Router } from "express";
import { asyncHandler } from "../utils/http.js";
import { requireAdmin, requireAnyUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { adminLoginSchema, studentLoginSchema } from "../validators/schemas.js";
import * as auth from "../controllers/authController.js";

export const authRouter = Router();

authRouter.post("/admin/login", validate(adminLoginSchema), asyncHandler(auth.adminLogin));
authRouter.post("/student/login", validate(studentLoginSchema), asyncHandler(auth.studentLogin));
authRouter.post("/logout", asyncHandler(auth.logout));
authRouter.get("/session", asyncHandler(auth.session));

// Compatibility aliases used by the existing React screens
authRouter.post("/login", asyncHandler(async (req, res) => {
  if (req.body?.role === "admin") {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Validation failed", detail: parsed.error.flatten() });
    req.body = parsed.data;
    return auth.adminLogin(req, res);
  }
  const parsed = studentLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", detail: parsed.error.flatten() });
  req.body = parsed.data;
  return auth.studentLogin(req, res);
}));
void requireAdmin;
void requireAnyUser;
