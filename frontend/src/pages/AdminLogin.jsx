import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import api, { formatApiError } from "../services/api";
import AuthService from "../navigation/AuthService";

function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/accounts/login/",
        {
          username: form.username,
          password: form.password,
          role: "admin",
        }
      );

      AuthService.syncFromSession({
        authenticated: true,
        role: response.data.role,
      });
      navigate("/admin-dashboard");
    } catch (err) {
      setError(formatApiError(err, "Unable to sign in"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16 bg-slate-50/30">
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-slate-900/10 blur-[120px] pointer-events-none animate-float" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary-500/5 blur-[120px] pointer-events-none animate-float [animation-delay:2s]" />

      <div className="w-full max-w-md animate-scale-in">
        {/* Portal Branding / Card header */}
        <div className="mb-8 text-center animate-fade-in-down">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white shadow-xl shadow-slate-900/20 hover:scale-[1.05] transition-transform duration-300">
            <ShieldCheck size={32} className="stroke-[1.75]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">System Administration</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl font-display">Admin Portal</h1>
        </div>

        {/* Login Form Panel */}
        <form onSubmit={handleLogin} className="glass-panel w-full rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/60">
          <h2 className="mb-6 text-lg font-bold tracking-tight text-slate-800">Sign in to console</h2>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 animate-fade-in">
              <p className="font-semibold">Authentication Alert</p>
              <p className="mt-0.5 text-xs text-red-600/90">{error}</p>
            </div>
          )}

          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Username</span>
            <input
              value={form.username}
              required
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 hover:scale-[1.01] focus:scale-[1.01] transition-all duration-300"
              placeholder="Admin username"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 hover:scale-[1.01] focus:scale-[1.01] transition-all duration-300"
              placeholder="••••••••"
            />
          </label>

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 px-4 py-3.5 text-sm font-bold text-white hover:from-slate-950 hover:to-slate-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-60 transition duration-300 shadow-md shadow-slate-900/20"
          >
            <LockKeyhole size={16} className={loading ? "animate-pulse" : ""} />
            {loading ? "Verifying..." : "Open Control Panel"}
          </button>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <Link to="/" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-850 hover:translate-x-0.5 inline-block transition-all duration-200">
              Back to Student Portal
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default AdminLogin;
