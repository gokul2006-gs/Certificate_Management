import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const studentLoginSchema = z.object({
  student_id: z.string().trim().min(1),
  password: z.string().min(1),
});

export const studentCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  student_id: z.string().trim().optional(),
  password: z.string().min(6).optional(),
});

export const studentUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export const bulkDeleteSchema = z.object({
  student_ids: z.array(z.string().trim().min(1)).min(1),
});

export const courseSchema = z.object({
  course_name: z.string().trim().min(1),
  duration: z.string().trim().min(1),
  course_type: z
    .enum(["Technical", "Basic", "Non-Technical", "Graphic Designing", "Development Services"])
    .optional(),
});

export const revokeSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
