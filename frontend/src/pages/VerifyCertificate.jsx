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
import api from "../services/api";

function VerifyCertificate() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <div className="text-center animate-pulse-slow">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-100 text-primary-600 mb-3">
            <ShieldCheck size={26} className="animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <p className="text-sm font-bold text-slate-700">Verifying credential integrity...</p>
        </div>
      </main>
    );
  }

  const valid = data?.valid;
  const certificateUrl = data?.certificate || "";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 bg-slate-50/30 relative">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent-500/5 blur-[80px] pointer-events-none" />

      <section className="mx-auto w-full max-w-5xl rounded-3xl glass-panel p-6 shadow-xl relative z-10 animate-fade-in-up">
        {/* Verification Status Header */}
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl shadow-md ${valid ? "bg-emerald-100 text-emerald-700 shadow-emerald-500/10" : "bg-red-100 text-red-700 shadow-red-500/10"}`}>
            {valid ? <CheckCircle2 size={32} className="stroke-[2]" /> : <AlertTriangle size={32} />}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Secure Audit trail</p>
          <h1 className={`mt-1.5 text-2xl font-extrabold sm:text-3xl font-display ${valid ? "text-emerald-800" : "text-red-800"}`}>
            {valid ? "Credential Verified" : "Verification Failed"}
          </h1>
        </div>

        {valid ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            {/* Left Column: Certificate Previewer */}
            <div className="min-w-0 rounded-2xl border border-slate-200/60 bg-slate-100 p-2.5 shadow-inner">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Official Document Stream</span>
                  </div>
                </div>
                {isImageCertificate(certificateUrl) ? (
                  <img
                    src={certificateUrl}
                    alt="Verified certificate"
                    className="mx-auto max-h-[60vh] w-full object-contain"
                  />
                ) : (
                  <iframe
                    src={certificateUrl}
                    title="Verified certificate"
                    className="h-[60vh] min-h-[420px] w-full border-none bg-white"
                  />
                )}
              </div>
            </div>

            {/* Right Column: Verification Stats Card */}
            <aside className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                  Status Code
                </p>
                <p className="mt-1 text-base font-extrabold text-emerald-900">{data.certificate_status}</p>
              </div>

              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Credential Details
                </h2>
                <div className="divide-y divide-slate-100">
                  <VerifyField icon={User} label="Recipient Student" value={data.student_name} />
                  <VerifyField icon={IdCard} label="Student Reg No" value={data.student_id} />
                  <VerifyField icon={GraduationCap} label="Program of Study" value={data.course_name} />
                  <VerifyField
                    icon={CalendarDays}
                    label="Verification Date"
                    value={formatDate(data.issue_date)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <a
                  href={data.download_url || certificateUrl}
                  download
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-850 transition duration-200 shadow-md shadow-slate-950/15"
                >
                  <Download className="shrink-0" size={16} />
                  <span>Download PDF Document</span>
                </a>
                <a
                  href={certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition duration-200 shadow-sm"
                >
                  <ExternalLink className="shrink-0" size={16} />
                  <span>Inspect Original Asset</span>
                </a>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl bg-red-50 border border-red-200/40 p-6 text-center max-w-lg mx-auto">
            <h3 className="font-bold text-red-800 mb-1">Invalid Certificate Reference</h3>
            <p className="text-xs text-red-700/90 leading-relaxed">
              This certificate ID could not be validated. If you believe this is an error, please reach out to the Tech S Cube administration with the registration details.
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
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function VerifyField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-extrabold leading-snug text-slate-800">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default VerifyCertificate;
