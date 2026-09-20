import bcrypt from "bcryptjs";
import { connectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { Admin } from "../src/models/Admin.js";
import { Student } from "../src/models/Student.js";
import { Course } from "../src/models/Course.js";

await connectDb();

const passwordHash = await bcrypt.hash(env.adminPassword, 10);
const normalizedAdminUsername = String(env.adminUsername || "").trim().toUpperCase();
await Admin.findOneAndUpdate(
  { $or: [{ username: normalizedAdminUsername }, { email: env.adminEmail }] },
  {
    username: normalizedAdminUsername,
    email: env.adminEmail,
    passwordHash,
    role: "admin",
  },
  { upsert: true, new: true }
);

const courses = [
  { courseName: "Internship Training", duration: "3 Months", courseType: "Technical" },
  { courseName: "Full Stack Development", duration: "6 Months", courseType: "Technical" },
  { courseName: "Graphic Design Basics", duration: "2 Months", courseType: "Graphic Designing" },
];

for (const course of courses) {
  await Course.findOneAndUpdate({ courseName: course.courseName }, course, { upsert: true });
}

const studentPassword = await bcrypt.hash(env.defaultStudentPassword, 10);
const students = [
  { studentId: "TSC001", name: "Asha Kumar", email: "asha@example.com" },
  { studentId: "TSC002", name: "Rahul Menon", email: "rahul@example.com" },
];

for (const student of students) {
  await Student.findOneAndUpdate(
    { studentId: student.studentId },
    { ...student, passwordHash: studentPassword },
    { upsert: true }
  );
}

console.log("Seed complete.");
console.log(`Admin: ${env.adminUsername} / ${env.adminPassword}`);
console.log(`Students: TSC001, TSC002 / ${env.defaultStudentPassword}`);
process.exit(0);
