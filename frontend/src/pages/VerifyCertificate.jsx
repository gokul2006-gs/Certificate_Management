import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  GraduationCap,
  IdCard,
  ShieldCheck,
  User,
} from "lucide-react";
import api, { formatApiError } from "../services/api";

function VerifyCertificate() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    api
      .get(`/certificates/verify/${studentId}/`)
      .then((response) => setData(response.data))
      .catch((error) => setData(error.response?.data || { valid: false, status: "INVALID" }))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50/50 p-4">
        <div className="text-center animate-pulse">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary-100 text-primary-600 shadow-md">
            <ShieldCheck size={32} className="animate-rotate-slow" />
          </div>
          <p className="text-sm font-bold text-slate-700">Verifying certificate...</p>
        </div>
      </main>
    );
  }

  const valid = data?.valid;
  const certificateUrl = data?.certificate || "";
  const downloadUrl = data?.download_url || certificateUrl;

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setDownloading(true);
    setDownloadError("");

    try {
      const response = await api.get(downloadUrl, {
        baseURL: "",
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filenameFromDisposition(response.headers["content-disposition"], data?.student_id);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDownloadError(await formatDownloadError(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/30 px-3 py-4 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200/70 bg-white p-3 shadow-xl sm:p-5 lg:p-6 animate-scale-in">
        <div className="mb-5 text-center sm:mb-7">
          <div className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl shadow-md ${valid ? "bg-emerald-100 text-emerald-700 shadow-emerald-500/10" : "bg-red-100 text-red-700 shadow-red-500/10"} transition-transform duration-300 hover:scale-[1.05]`}>
            {valid ? <CheckCircle2 size={32} className="stroke-[2]" /> : <AlertTriangle size={32} />}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Secure audit trail</p>
          <h1 className={`mt-1.5 text-2xl font-extrabold sm:text-3xl font-display ${valid ? "text-emerald-800" : "text-red-800"}`}>
            {valid ? "Certificate Verified" : "Verification Failed"}
          </h1>
        </div>

        {valid ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
            <div className="min-w-0 rounded-xl border border-slate-200/60 bg-slate-100 p-2 shadow-inner sm:rounded-2xl">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Official Certificate</span>
                  </div>
                </div>
                {isImageCertificate(certificateUrl) ? (
                  <img
                    src={certificateUrl}
                    alt="Verified certificate"
                    className="mx-auto max-h-[64vh] w-full object-contain transition-transform duration-500 hover:scale-[1.01]"
                  />
                ) : (
                  <iframe
                    src={certificateUrl}
                    title="Verified certificate"
                    className="h-[62vh] min-h-[320px] w-full border-none bg-white sm:min-h-[420px]"
                  />
                )}
              </div>
            </div>

            <aside className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                  Status Code
                </p>
                <p className="mt-1 text-base font-extrabold text-emerald-900">{data.certificate_status}</p>
              </div>

              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Student Details
                </h2>
                <div className="divide-y divide-slate-100">
                  <VerifyField icon={User} label="Student Name" value={data.student_name} />
                  <VerifyField icon={IdCard} label="Student ID" value={data.student_id} />
                  <VerifyField icon={GraduationCap} label="Course" value={data.course_name} />
                  <VerifyField icon={CalendarDays} label="Issue Date" value={formatDate(data.issue_date)} />
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || !downloadUrl}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white shadow-md shadow-slate-950/15 transition-all duration-300 hover:bg-slate-850 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="shrink-0" size={16} />
                  <span>{downloading ? "Downloading..." : "Download Certificate"}</span>
                </button>
                <a
                  href={certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ExternalLink className="shrink-0" size={16} />
                  <span>Open Original File</span>
                </a>
                {downloadError && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {downloadError}
                  </p>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200/40 bg-red-50 p-6 text-center">
            <h3 className="mb-1 font-bold text-red-800">Invalid Certificate Reference</h3>
            <p className="text-xs leading-relaxed text-red-700/90">
              This certificate ID could not be validated. Please contact the Tech S Cube administration with the registration details.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function isImageCertificate(url = "") {
  return /\.(png|jpe?g)(\?|$)/i.test(url);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function filenameFromDisposition(disposition = "", studentId = "certificate") {
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `${studentId || "certificate"}-certificate`;
}

async function formatDownloadError(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.error || parsed.detail || "Download failed. Please try again.";
    } catch {
      return "Download failed. Please try again.";
    }
  }
  return formatApiError(error, "Download failed. Please try again.");
}

function VerifyField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-extrabold leading-snug text-slate-800">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

export default VerifyCertificate;
