import { Router } from "express";
import { asyncHandler } from "../utils/http.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { courseSchema } from "../validators/schemas.js";
import * as courses from "../controllers/courseController.js";

export const courseRouter = Router();

courseRouter.get("/", requireAdmin, asyncHandler(courses.listCourses));
courseRouter.post("/", requireAdmin, validate(courseSchema), asyncHandler(courses.createCourse));
courseRouter.put("/:id", requireAdmin, validate(courseSchema.partial()), asyncHandler(courses.updateCourse));
courseRouter.delete("/:id", requireAdmin, asyncHandler(courses.deleteCourse));
