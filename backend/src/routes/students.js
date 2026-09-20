import { Router } from "express";
import { asyncHandler } from "../utils/http.js";
import { requireAdmin, requireAnyUser } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { bulkDeleteSchema, studentCreateSchema, studentUpdateSchema } from "../validators/schemas.js";
import * as students from "../controllers/studentController.js";

export const studentRouter = Router();

studentRouter.get("/", requireAdmin, asyncHandler(students.listStudents));
studentRouter.post("/", requireAdmin, validate(studentCreateSchema), asyncHandler(students.createStudent));
studentRouter.post("/import", requireAdmin, upload.single("file"), asyncHandler(students.importStudents));
studentRouter.post("/bulk-delete", requireAdmin, validate(bulkDeleteSchema), asyncHandler(students.bulkDeleteStudents));
studentRouter.get("/:studentId", requireAnyUser, asyncHandler(students.getStudent));
studentRouter.put("/:studentId", requireAdmin, validate(studentUpdateSchema), asyncHandler(students.updateStudent));
studentRouter.delete("/:studentId", requireAdmin, asyncHandler(students.deleteStudent));
