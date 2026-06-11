import StudentLogin from "../pages/StudentLogin";
import StudentDashboard from "../pages/StudentDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import Students from "../pages/Students";
import Courses from "../pages/Courses";
import UploadCertificate from "../pages/UploadCertificate";
import DatabaseConnection from "../pages/DatabaseConnection";
import AdminLogin from "../pages/AdminLogin";
import VerifyCertificate from "../pages/VerifyCertificate";

export const APP_ROUTES = [
  {
    path: "/",
    element: StudentLogin,
    access: "guest",
  },
  {
    path: "/admin",
    element: AdminLogin,
    access: "guest",
  },
  {
    path: "/student-dashboard",
    element: StudentDashboard,
    access: "protected",
    role: "student",
  },
  {
    path: "/admin-dashboard",
    element: AdminDashboard,
    access: "protected",
    role: "admin",
  },
  {
    path: "/students",
    element: Students,
    access: "protected",
    role: "admin",
  },
  {
    path: "/courses",
    element: Courses,
    access: "protected",
    role: "admin",
  },
  {
    path: "/upload-certificate",
    element: UploadCertificate,
    access: "protected",
    role: "admin",
  },
  {
    path: "/database-connection",
    element: DatabaseConnection,
    access: "protected",
    role: "admin",
  },
  {
    path: "/verify/:studentId",
    element: VerifyCertificate,
    access: "open",
  },
];
