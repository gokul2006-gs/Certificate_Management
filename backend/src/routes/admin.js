import { Router } from "express";
import { asyncHandler } from "../utils/http.js";
import { requireAdmin } from "../middleware/auth.js";
import * as admin from "../controllers/adminController.js";
import * as students from "../controllers/studentController.js";

export const adminRouter = Router();

adminRouter.get("/dashboard-stats", requireAdmin, asyncHandler(admin.dashboardStats));
adminRouter.get("/login-logs", requireAdmin, asyncHandler(admin.loginLogs));
adminRouter.get("/database-status", requireAdmin, asyncHandler(admin.databaseStatus));
adminRouter.get("/db-connection", requireAdmin, asyncHandler(admin.databaseStatus));
void students;
