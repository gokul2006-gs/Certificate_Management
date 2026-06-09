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
    return <main className="grid min-h-screen place-items-center bg-slate-100 p-4">Checking certificate...</main>;
  }

  const valid = data?.valid;
  const certificateUrl = data?.certificate || "";

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-5 text-center sm:mb-6">
          <div className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-lg sm:h-16 sm:w-16 ${valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {valid ? <CheckCircle2 size={34} /> : <AlertTriangle size={34} />}
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Tech S Cube IT Solutions</p>
          <h1 className={`text-2xl font-bold sm:text-3xl ${valid ? "text-emerald-700" : "text-red-700"}`}>
            {valid ? "VALID Certificate" : "INVALID Certificate"}
          </h1>
        </div>

        {valid ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3">
              {isImageCertificate(certificateUrl) ? (
                <img
                  src={certificateUrl}
                  alt="Verified certificate"
                  className="mx-auto max-h-[74vh] w-full rounded-md object-contain"
                />
              ) : (
                <iframe
                  src={certificateUrl}
                  title="Verified certificate"
                  className="h-[70vh] min-h-96 w-full rounded-md bg-white"
                />
              )}
            </div>

            <aside className="min-w-0 space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Certificate Status
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{data.certificate_status}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Student Details
                </h2>
                <div className="divide-y divide-slate-100">
                  <VerifyField icon={User} label="Student Name" value={data.student_name} />
                  <VerifyField icon={IdCard} label="Student ID" value={data.student_id} />
                  <VerifyField icon={GraduationCap} label="Course Name" value={data.course_name} />
                  <VerifyField
                    icon={CalendarDays}
                    label="Issue Date"
                    value={formatDate(data.issue_date)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <a
                  href={data.download_url || certificateUrl}
                  download
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-cyan-700 sm:text-base"
                >
                  <Download className="shrink-0" size={18} />
                  <span>Download Certificate</span>
                </a>
                <a
                  href={certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 sm:text-base"
                >
                  <ExternalLink className="shrink-0" size={18} />
                  <span>Open Certificate</span>
                </a>
              </div>
            </aside>
          </div>
        ) : (
          <p className="rounded-lg bg-red-50 p-4 text-center font-medium text-red-700">
            This certificate ID could not be verified in the Tech S Cube records.
          </p>
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
    month: "short",
    day: "2-digit",
  });
}

function VerifyField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-base font-semibold leading-snug text-slate-950">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default VerifyCertificate;
