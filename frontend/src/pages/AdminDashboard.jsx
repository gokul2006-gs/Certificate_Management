import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout, { PageHeader } from "../components/Layout";
import api, { formatApiError } from "../services/api";

const EMPTY_STATS = { students: 0, courses: 0, certificates: 0, expiringSoon: 0 };

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", options);
}

function getActivityMonths(activity) {
  const counts = new Map((activity || []).map((item) => [item.month, item.count]));
  const currentMonth = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth() - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      label: date.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
      count: counts.get(key) || 0,
    };
  });
}

function AdminDashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [activity, setActivity] = useState([]);
  const [expiringCertificates, setExpiringCertificates] = useState([]);
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(async (signal) => {
    setRefreshing(true);
    setLoadError("");
    const requests = await Promise.allSettled([
      api.get("/admin/dashboard-stats", { signal }),
      api.get("/certificates", { params: { page: 1, pageSize: 6 }, signal }),
      api.get("/admin/login-logs", { params: { page: 1, pageSize: 5 }, signal }),
    ]);

    if (signal?.aborted) return;
    const [statsResult, certificatesResult, logsResult] = requests;
    const errors = [];
    if (statsResult.status === "fulfilled") {
      const data = statsResult.value.data;
      setStats({ ...EMPTY_STATS, ...data });
      setActivity(data.certificateActivity || []);
      setExpiringCertificates(data.expiringCertificates || []);
    } else {
      errors.push(formatApiError(statsResult.reason, "Could not load dashboard statistics."));
    }
    if (certificatesResult.status === "fulfilled") {
      setRecentCertificates(certificatesResult.value.data.items || certificatesResult.value.data);
    } else {
      errors.push(formatApiError(certificatesResult.reason, "Could not load recent certificates."));
    }
    if (logsResult.status === "fulfilled") {
      setLoginLogs(logsResult.value.data.items || logsResult.value.data);
    } else {
      errors.push(formatApiError(logsResult.reason, "Could not load administrator activity."));
    }
    setLoadError(errors.join(" "));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Loading the dashboard synchronizes component state with external API data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const chartMonths = useMemo(() => getActivityMonths(activity), [activity]);
  const chartMax = Math.max(1, ...chartMonths.map((month) => month.count));

  const handleExcelUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    const form = event.currentTarget;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setNotice(null);
    try {
      const response = await api.post("/students/import", formData);
      const createdCount = response.data.created_count ?? 0;
      const updatedCount = response.data.updated_count ?? 0;
      const warningsCount = response.data.warnings?.length ?? 0;
      setNotice({
        type: "success",
        text: `${createdCount} students created, ${updatedCount} updated.${warningsCount ? ` ${warningsCount} warnings to review.` : ""}`,
      });
      setFile(null);
      form.reset();
      await loadDashboard();
    } catch (error) {
      setNotice({ type: "error", text: formatApiError(error, "Excel upload failed.") });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAllCertificates = async () => {
    setDownloading(true);
    setNotice(null);
    let downloadUrl;
    try {
      const response = await api.get("/certificates/download-all", { responseType: "blob" });
      downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "all_certificates.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotice({ type: "success", text: "Your certificate archive is downloading." });
    } catch (error) {
      setNotice({ type: "error", text: formatApiError(error, "Failed to download certificates.") });
    } finally {
      if (downloadUrl) window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60_000);
      setDownloading(false);
    }
  };

  const cards = [
    { label: "Registered students", value: stats.students, icon: Users, tone: "blue", to: "/students" },
    { label: "Available courses", value: stats.courses, icon: BookOpen, tone: "violet", to: "/courses" },
    { label: "Certificates issued", value: stats.certificates, icon: Award, tone: "teal", to: "/upload-certificate" },
    { label: "Expiring in 30 days", value: stats.expiringSoon, icon: AlertTriangle, tone: "amber", to: "/upload-certificate" },
  ];

  return (
    <Layout role="admin">
      <PageHeader title="Overview" eyebrow="Workspace">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadDashboard()}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="sr-only sm:not-sr-only">{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadAllCertificates}
            disabled={downloading || stats.certificates === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowDownToLine size={15} />
            {downloading ? "Preparing…" : "Export"}
          </button>
          <Link
            to="/upload-certificate"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <Plus size={15} />
            Issue certificate
          </Link>
        </div>
      </PageHeader>

      {loadError && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}
      {notice && (
        <div role="status" className={`mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>
          {notice.type === "error" ? <AlertTriangle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
          <button type="button" className="ml-auto text-xs font-semibold underline underline-offset-2" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <section aria-label="Key statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone, to }) => (
          <Link
            key={label}
            to={to}
            className="group rounded-xl border border-slate-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : tone === "violet" ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300" : tone === "teal" ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"}`}>
                <Icon size={17} />
              </span>
              <ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />
            </div>
            <p className="mt-5 text-[12px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
            {loading ? (
              <div className="mt-1 h-8 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ) : (
              <p className="mt-1 text-[26px] font-semibold leading-8 tracking-tight text-slate-900 dark:text-slate-100">{Number(value || 0).toLocaleString("en-IN")}</p>
            )}
          </Link>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Certificate activity</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Credentials issued over the last six months</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Activity size={16} />
            </span>
          </div>
          <div className="mt-6 grid h-36 grid-cols-6 items-end gap-3" role="img" aria-label={`Certificate issuances by month: ${chartMonths.map((month) => `${month.label} ${month.count}`).join(", ")}`}>
            {chartMonths.map((month) => (
              <div key={month.label} className="flex h-full flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">{month.count || ""}</span>
                <div className="flex h-24 w-full items-end rounded-t-md bg-slate-50 dark:bg-slate-800">
                  <div
                    className="w-full rounded-t-md bg-primary-500 transition-[height] duration-300"
                    style={{ height: `${month.count ? Math.max(8, (month.count / chartMax) * 100) : 3}%` }}
                    title={`${month.label}: ${month.count} certificates`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Expiry watch</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Valid certificates expiring within 30 days</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertTriangle size={12} /> {loading ? "…" : stats.expiringSoon}
            </span>
          </div>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="space-y-3 py-2" aria-label="Loading expiry alerts">
                <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : expiringCertificates.length ? expiringCertificates.map((certificate) => (
              <div key={certificate.id} className="flex items-center justify-between gap-3 py-3 first:pt-1">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{certificate.student_name || certificate.student_id}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{certificate.course_name || "Certificate"} · {certificate.student_id}</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-amber-700 dark:text-amber-300">{formatDate(certificate.expires_at)}</span>
              </div>
            )) : (
              <div className="flex items-center gap-2 py-7 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                No certificates expiring soon.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recently issued</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Latest certificate records</p>
            </div>
            <Link to="/upload-certificate" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="space-y-3 p-5" aria-label="Loading recent certificates">
                {[1, 2, 3].map((item) => <div key={item} className="h-9 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : recentCertificates.length ? recentCertificates.map((certificate) => (
              <div key={certificate.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                  <FileText size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{certificate.student_id}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{certificate.course_name || "Certificate"} · {formatDate(certificate.issue_date)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${certificate.status === "VALID" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : certificate.status === "EXPIRED" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {certificate.status || "ISSUED"}
                </span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No certificate activity yet.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Admin sessions</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recent administrator sign-ins</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="space-y-3 p-5" aria-label="Loading administrator sessions">
                {[1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : loginLogs.length ? loginLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${log.logout_at ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
                    <Users size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{log.username}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatDate(log.login_at, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-medium ${log.logout_at ? "text-slate-400" : "text-emerald-700 dark:text-emerald-300"}`}>{log.logout_at ? "Ended" : "Active"}</span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No administrator sessions recorded.</div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"><Upload size={15} /></span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Import students</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Add or update student records from an Excel workbook.</p>
          </div>
        </div>
        <form onSubmit={handleExcelUpload} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="excel-file-upload" className="sr-only">Choose an Excel file</label>
          <input
            type="file"
            accept=".xlsx"
            id="excel-file-upload"
            required
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
          />
          <button
            type="submit"
            disabled={uploading || !file}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Upload size={14} />
            {uploading ? "Importing…" : "Import file"}
          </button>
        </form>
      </section>
    </Layout>
  );
}

export default AdminDashboard;
