import { useEffect, useState } from "react";
import { Award, BookOpen, FileText, LogIn, Upload, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Layout, { PageHeader } from "../components/Layout";
import api, { getCsrfToken } from "../services/api";

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, courses: 0, certificates: 0 });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLogs, setLoginLogs] = useState([]);

  const loadStats = async () => {
    const response = await api.get("/accounts/dashboard-stats/");
    setStats(response.data);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/accounts/dashboard-stats/"),
      api.get("/accounts/admin-login-logs/"),
    ])
      .then(([statsRes, logsRes]) => {
        if (active) {
          setStats(statsRes.data);
          setLoginLogs(logsRes.data);
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error.response?.data?.error || "Please login again");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleExcelUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setMessage("");

    try {
      await getCsrfToken();
      const response = await api.post("/accounts/upload-excel/", formData);
      const createdCount = response.data.created_count ?? 0;
      const updatedCount = response.data.updated_count ?? 0;
      const warningsCount = response.data.warnings?.length ?? 0;
      setMessage(
        `${createdCount} students created, ${updatedCount} updated.` +
          (warningsCount ? ` Warnings: ${warningsCount}.` : "") +
          ` Default password: ${response.data.default_password}`
      );
      setFile(null);
      await loadStats();
    } catch (err) {
      setMessage(err.response?.data?.error || "Excel upload failed");
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: "Total Registered Students", value: stats.students, icon: Users, color: "bg-primary-50 text-primary-600 border-primary-100" },
    { label: "Enrolled Courses", value: stats.courses, icon: BookOpen, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { label: "Issued Certificates", value: stats.certificates, icon: FileText, color: "bg-amber-50 text-amber-600 border-amber-100" },
  ];

  return (
    <Layout role="admin">
      <PageHeader title="Admin Dashboard" eyebrow="Operations Overview">
        <Link to="/upload-certificate" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-md shadow-slate-950/10 active:scale-[0.98]">
          <Award size={15} />
          Issue Certificate
        </Link>
      </PageHeader>

      {/* Stats Section */}
      <section className="grid gap-6 md:grid-cols-3 animate-fade-in-up">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl border ${card.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-800 font-display">{card.value}</p>
            </div>
          );
        })}
      </section>

      {/* Excel Upload Section */}
      <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up">
        <div className="mb-6">
          <h3 className="text-base font-bold tracking-tight text-slate-800">Excel Bulk Student Upload</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-2xl">
            Upload an `.xlsx` file with `Name` and `Email` columns. Optionally include `Course` (or `course_name`) to set each student's registered course.
            Existing profiles matching standard email structures will be updated.
          </p>
        </div>

        <form onSubmit={handleExcelUpload} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 relative">
            <input
              type="file"
              accept=".xlsx"
              id="excel-file-upload"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200"
            />
          </div>
          <button
            disabled={loading || !file}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-primary-600/15"
          >
            <Upload size={15} />
            {loading ? "Parsing spreadsheet..." : "Import Students"}
          </button>
        </form>
        {message && (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">
            {message}
          </div>
        )}
      </section>

      {/* Audit Log Table */}
      <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 bg-slate-50/50">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 border border-primary-100 text-primary-600">
            <LogIn size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Admin Session Log</h3>
            <p className="text-[10px] text-slate-400">Audit trail of administrator console entries</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">#</th>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Login Time</th>
                <th className="px-5 py-3.5">Logout Time</th>
                <th className="px-5 py-3.5">Origin IP</th>
                <th className="px-5 py-3.5">Session Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loginLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center font-medium text-slate-400">
                    No administrator logins recorded.
                  </td>
                </tr>
              ) : (
                loginLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5 text-slate-400">{index + 1}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{log.username}</td>
                    <td className="px-5 py-3.5 font-medium">{formatDateTime(log.login_at)}</td>
                    <td className="px-5 py-3.5 font-medium">{formatDateTime(log.logout_at)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{log.ip_address || "—"}</td>
                    <td className="px-5 py-3.5">
                      {log.logout_at ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          Terminated
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 animate-pulse">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

export default AdminDashboard;
