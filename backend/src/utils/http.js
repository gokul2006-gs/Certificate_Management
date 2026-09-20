export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function publicStudent(student) {
  if (!student) return null;
  return {
    id: student._id,
    student_id: student.studentId,
    name: student.name,
    email: student.email,
    created_at: student.createdAt,
  };
}

export function publicCourse(course) {
  return {
    id: course._id,
    course_name: course.courseName,
    duration: course.duration,
    course_type: course.courseType,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  };
}
