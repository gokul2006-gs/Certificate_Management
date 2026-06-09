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
    { label: "Total Students", value: stats.students, icon: Users, color: "bg-cyan-50 text-cyan-700" },
    { label: "Courses", value: stats.courses, icon: BookOpen, color: "bg-emerald-50 text-emerald-700" },
    { label: "Certificates", value: stats.certificates, icon: FileText, color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <Layout role="admin">
      <PageHeader title="Admin Dashboard" eyebrow="Certificate Operations">
        <Link to="/upload-certificate" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          <Award size={17} />
          Upload Certificate
        </Link>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-lg ${card.color}`}>
                <Icon size={22} />
              </div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">Excel Bulk Student Upload</h3>
          <p className="text-sm text-slate-500">
            Use an .xlsx file with `Name` and `Email` columns. Optionally include `Course` (or `course_name`) to set each student's registered course.
            Existing students (matched by Email) will be updated with the course from Excel.
          </p>
        </div>

        <form onSubmit={handleExcelUpload} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="file"
            accept=".xlsx"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            disabled={loading || !file}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            <Upload size={18} />
            {loading ? "Uploading..." : "Upload Excel"}
          </button>
        </form>
        {message && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
            <LogIn size={18} />
          </div>
          <h3 className="font-semibold text-slate-950">Admin Login History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Login Time</th>
                <th className="px-4 py-3">Logout Time</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loginLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No login records yet.
                  </td>
                </tr>
              ) : (
                loginLogs.map((log, index) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{log.username}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(log.login_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(log.logout_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{log.ip_address || "—"}</td>
                    <td className="px-4 py-3">
                      {log.logout_at ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Logged out
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
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
