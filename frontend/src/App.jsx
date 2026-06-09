import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Students from "./pages/Students";
import UploadCertificate from "./pages/UploadCertificate";
import DatabaseConnection from "./pages/DatabaseConnection";
import AdminLogin from "./pages/AdminLogin";
import VerifyCertificate from "./pages/VerifyCertificate";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<StudentLogin />}
        />

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute role="admin">
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload-certificate"
          element={
            <ProtectedRoute role="admin">
              <UploadCertificate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/database-connection"
          element={
            <ProtectedRoute role="admin">
              <DatabaseConnection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={<AdminLogin />}
        />
        <Route
          path="/verify/:studentId"
          element={<VerifyCertificate />}
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;
