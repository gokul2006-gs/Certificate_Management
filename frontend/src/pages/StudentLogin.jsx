import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, LogIn } from "lucide-react";
import api, { checkSession, formatApiError, getCsrfToken } from "../services/api";

function StudentLogin() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("Tech@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await getCsrfToken();
      await api.post("/accounts/login/", {
        role: "student",
        student_id: studentId,
        password,
      });

      const session = await checkSession();
      if (!session.authenticated || session.role !== "student") {
        throw new Error(
          "Session could not be established. Try logging in again."
        );
      }

      localStorage.setItem("role", session.role);
      localStorage.setItem("student_id", session.student_id);
      navigate("/student-dashboard");
    } catch (err) {
      setError(formatApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-accent-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Portal Branding / Card header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white shadow-xl shadow-primary-500/20">
            <GraduationCap size={32} className="stroke-[1.75]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Tech S Cube IT Solutions</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl font-display">Student Portal</h1>
        </div>

        {/* Login Form Panel */}
        <form onSubmit={handleLogin} className="glass-panel w-full rounded-2xl p-8 shadow-xl">
          <h2 className="mb-6 text-lg font-bold tracking-tight text-slate-800">Access your certificates</h2>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700">
              <p className="font-semibold">Verification Alert</p>
              <p className="mt-0.5 text-xs text-red-600/90">{error}</p>
            </div>
          )}

          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Student ID</span>
            <input
              value={studentId}
              required
              onChange={(event) => setStudentId(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all duration-200"
              placeholder="e.g. TSC001"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all duration-200"
            />
          </label>

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white hover:bg-slate-850 active:scale-[0.99] disabled:opacity-60 transition duration-200 shadow-lg shadow-slate-950/10"
          >
            <LogIn size={16} />
            {loading ? "Signing you in..." : "Access Dashboard"}
          </button>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <Link to="/admin" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition">
              Administrator Access
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default StudentLogin;
