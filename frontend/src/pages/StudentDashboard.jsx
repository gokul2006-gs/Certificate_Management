import { useEffect, useState } from "react";
import { Award, Calendar, IdCard, Mail, QrCode, ScanLine, ShieldCheck } from "lucide-react";
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] animate-pulse">
          <div className="space-y-6">
            <div className="h-48 rounded-2xl border border-white/60 shimmer-bg" />
            <div className="h-36 rounded-2xl border border-white/60 shimmer-bg" />
          </div>
          <div className="h-80 rounded-2xl border border-white/60 shimmer-bg" />
        </div>
      </Layout>
    );
  }

  const isValid = certificateStatus === "VALID";

  return (
    <Layout role="student">
      <PageHeader title={`Welcome, ${student.name}`} eyebrow="My Certificate" />

      {message && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] items-start animate-fade-in-up">
        <div className="space-y-6">
          <section className="glass-panel rounded-2xl p-6 shadow-sm">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Student Profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard icon={IdCard} label="Student Identification" value={student.student_id} />
              <InfoCard icon={Mail} label="Contact Email" value={student.email} />
              <InfoCard icon={Award} label="Enrolled Specialization" value={certificate?.course_name || "—"} />
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
            {certificate?.course_name ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Course</p>
                  <p className="text-base font-extrabold text-slate-800">{certificate.course_name}</p>
                </div>
                {certificate.issue_date && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Issue Date</p>
                    <p className="text-sm font-semibold text-slate-700">{new Date(certificate.issue_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Certificate not yet issued.</p>
            )}
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

              <div className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
                <ScanLine size={14} />
                Scan QR to verify credentials
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

export default StudentDashboard;


