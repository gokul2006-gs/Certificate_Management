import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { checkSession } from "../services/api";

function ProtectedRoute({ children, role }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    checkSession()
      .then((session) => {
        if (!active) return;

        if (!session.authenticated) {
          setStatus("unauthorized");
          return;
        }

        if (role === "admin" && session.role !== "admin") {
          setStatus("unauthorized");
          return;
        }

        if (role === "student" && (session.role !== "student" || !session.student_id)) {
          setStatus("unauthorized");
          return;
        }

        localStorage.setItem("role", session.role);
        if (session.student_id) {
          localStorage.setItem("student_id", session.student_id);
        } else {
          localStorage.removeItem("student_id");
        }

        setStatus("authorized");
      })
      .catch(() => {
        if (active) {
          setStatus("unauthorized");
        }
      });

    return () => {
      active = false;
    };
  }, [role]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">Checking session...</p>
      </main>
    );
  }

  if (status === "unauthorized") {
    localStorage.clear();
    return <Navigate to={role === "admin" ? "/admin" : "/"} replace />;
  }

  return children;
}

export default ProtectedRoute;
