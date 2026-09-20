import { lazy } from "react";

const StudentLogin = lazy(() => import("../pages/StudentLogin"));
const StudentDashboard = lazy(() => import("../pages/StudentDashboard"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const Students = lazy(() => import("../pages/Students"));
const Courses = lazy(() => import("../pages/Courses"));
const UploadCertificate = lazy(() => import("../pages/UploadCertificate"));
const DatabaseConnection = lazy(() => import("../pages/DatabaseConnection"));
const AdminLogin = lazy(() => import("../pages/AdminLogin"));
const VerifyCertificate = lazy(() => import("../pages/VerifyCertificate"));

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
