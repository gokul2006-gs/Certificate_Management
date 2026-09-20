import { Course } from "../models/Course.js";
import { parsePagination, paginated } from "../utils/pagination.js";
import { publicCourse } from "../utils/http.js";

export async function listCourses(req, res) {
  const { page, pageSize, skip } = parsePagination(req.query);
  const search = String(req.query.search || "").trim();
  const filter = search
    ? {
        $or: [
          { courseName: new RegExp(search, "i") },
          { duration: new RegExp(search, "i") },
          { courseType: new RegExp(search, "i") },
        ],
      }
    : {};
  if (req.query.page || req.query.pageSize) {
    const [items, total] = await Promise.all([
      Course.find(filter).sort({ courseName: 1 }).skip(skip).limit(pageSize),
      Course.countDocuments(filter),
    ]);
    return res.json(paginated(items.map(publicCourse), total, { page, pageSize }));
  }
  const items = await Course.find(filter).sort({ courseName: 1 });
  res.json(items.map(publicCourse));
}

export async function createCourse(req, res) {
  const course = await Course.create({
    courseName: req.body.course_name,
    duration: req.body.duration,
    courseType: req.body.course_type || "Technical",
  });
  res.status(201).json(publicCourse(course));
}

export async function updateCourse(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  if (req.body.course_name) course.courseName = req.body.course_name;
  if (req.body.duration) course.duration = req.body.duration;
  if (req.body.course_type) course.courseType = req.body.course_type;
  await course.save();
  res.json(publicCourse(course));
}

export async function deleteCourse(req, res) {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json({ message: "Course deleted successfully" });
}
