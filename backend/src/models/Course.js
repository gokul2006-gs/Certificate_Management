import mongoose from "mongoose";

export const COURSE_TYPES = [
  "Technical",
  "Basic",
  "Non-Technical",
  "Graphic Designing",
  "Development Services",
];

const courseSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    courseType: { type: String, enum: COURSE_TYPES, default: "Technical" },
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
