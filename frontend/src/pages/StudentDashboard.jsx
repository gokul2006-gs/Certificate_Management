import { useEffect, useState } from "react";
import { Award, Calendar, ExternalLink, IdCard, Mail, QrCode, ScanLine, ShieldCheck } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api from "../services/api";
import AuthService from "../navigation/AuthService";

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [certificateStatus, setCertificateStatus] = useState("PENDING");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const studentId = AuthService.getStudentId();
    if (!studentId) {
      setMessage("Please login again");
      return;
    }

    api
      .get(`/accounts/profile/${studentId}/`)
      .then((response) => setStudent(response.data))
      .catch((error) => setMessage(error.response?.data?.error || "Please login again"));

    api
      .get(`/certificates/view/${studentId}/`)
      .then((response) => {
        setCertificate(response.data);
        setCertificateStatus(response.data.status);
      })
      .catch(() => setCertificateStatus("PENDING"));
  }, []);

  if (!student) {
    return (
      <Layout role="student">
        <PageHeader title="Loading Profile..." eyebrow="My Certificate" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] animate-pulse">
          <div className="min-h-[420px] rounded-2xl border border-white/60 shimmer-bg" />
          <div className="rounded-2xl border border-white/60 p-6">
            <div className="h-6 w-48 shimmer-bg rounded" />
            <div className="mx-auto mt-6 aspect-square w-full max-w-[240px] shimmer-bg rounded-2xl" />
            <div className="mt-6 h-12 w-full shimmer-bg rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const isValid = certificateStatus === "VALID";
  const certificateAvailable = Boolean(certificate?.certificate_available && certificate?.certificate);

  return (
    <Layout role="student">
      <PageHeader title={`Welcome, ${student.name}`} eyebrow="My Certificate" />

      {message && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] items-start animate-fade-in-up">
        <div className="space-y-6">
          {certificate ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Official Certificate</p>
                  <h3 className="mt-1 truncate text-lg font-extrabold text-slate-900">Certificate Preview</h3>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${isValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {certificateStatus}
                </span>
              </div>

              {certificateAvailable ? (
                <div className="bg-slate-100 p-2">
                  {isImageCertificate(certificate.certificate) ? (
                    <img
                      src={certificate.certificate}
                      alt="Student certificate"
                      className="mx-auto max-h-[68vh] w-full rounded-xl bg-white object-contain shadow-sm"
                    />
                  ) : (
                    <iframe
                      src={certificate.certificate}
                      title="Student certificate"
                      className="h-[68vh] min-h-[420px] w-full rounded-xl border-0 bg-white shadow-sm"
                    />
                  )}
                </div>
              ) : (
                <div className="grid min-h-[300px] place-items-center p-6 text-center">
                  <div className="max-w-md">
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-700">
                      <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">Certificate is valid</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The certificate record exists, but the file is not available on the server. Ask the admin to upload or regenerate it.
                    </p>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="rounded-2xl border border-amber-200/50 bg-amber-50 p-6 text-center">
              <p className="text-sm font-semibold text-amber-800">
                Your certificate has not been uploaded yet. Please check back later.
              </p>
            </div>
          )}

          <section className="glass-panel rounded-2xl p-6 shadow-sm">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Student Profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard icon={IdCard} label="Student Identification" value={student.student_id} />
              <InfoCard icon={Mail} label="Contact Email" value={student.email} />
              <InfoCard icon={Award} label="Enrolled Specialization" value={student.course_name} />
              <InfoCard
                icon={ShieldCheck}
                label="Certificate State"
                customBadge={
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${isValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {certificateStatus}
                  </span>
                }
              />
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-600">
                <Calendar size={18} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Specialization Details</h3>
            </div>
            <p className="text-base font-extrabold text-slate-800">{student.course_name}</p>
            <p className="mt-1 text-sm text-slate-500">Includes active certificate issuing, course modules, and QR validation.</p>
          </section>
        </div>

        <aside className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
              <QrCode size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Verification QR</h3>
              <p className="text-xs text-slate-400">Scan to view certificate and details</p>
            </div>
          </div>

          {certificate ? (
            <div className="text-center">
              <div className="mb-5">
                <span className="inline-flex rounded-full bg-emerald-100/70 border border-emerald-200/50 px-3 py-1 text-xs font-bold text-emerald-800">
                  ACTIVE & VALID
                </span>
              </div>

              {certificate.qr && (
                <a
                  href={certificate.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg"
                >
                  <img
                    src={certificate.qr}
                    alt="Certificate QR code"
                    className="aspect-square w-full object-contain"
                  />
                </a>
              )}

              <div className="mt-6 space-y-3">
                <a
                  href={certificate.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-700 transition duration-200 hover:bg-slate-50"
                >
                  <ExternalLink size={14} />
                  Open Certificate
                </a>

                <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
                  <ScanLine size={14} />
                  Scan QR to verify credentials
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50/50 border border-amber-200/30 p-5 text-center">
              <p className="text-sm font-medium text-amber-800">
                Your certificate has not been uploaded yet.
              </p>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
}

function InfoCard({ icon: Icon, label, value, customBadge }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50/50 border border-slate-100 p-4 transition-all duration-300 ease-out hover:bg-white hover:scale-[1.02] hover:shadow-md">
      <div className="mb-1.5 flex items-center gap-2 text-slate-400">
        <Icon className="shrink-0" size={15} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      {customBadge ? (
        <div className="mt-1">{customBadge}</div>
      ) : (
        <p className="break-words font-extrabold text-slate-800">{value || "-"}</p>
      )}
    </div>
  );
}

function isImageCertificate(url = "") {
  return /\.(png|jpe?g)(\?|$)/i.test(url);
}

export default StudentDashboard;
