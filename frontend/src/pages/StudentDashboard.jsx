import { useEffect, useState } from "react";
import { Award, Calendar, Download, IdCard, Mail, QrCode, ScanLine, ShieldCheck } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api from "../services/api";

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [certificateStatus, setCertificateStatus] = useState("PENDING");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const studentId = localStorage.getItem("student_id");

    api
      .get(`/accounts/profile/${studentId}/`)
      .then((response) => {
        setStudent(response.data);
      })
      .catch((error) => {
        setMessage(error.response?.data?.error || "Please login again");
      });

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
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md mx-auto my-12 animate-fade-in-up">
          <div className="mx-auto animate-pulse-slow grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500 mb-4">
            <Award size={24} />
          </div>
          <p className="font-semibold text-slate-700">{message || "Accessing profile details..."}</p>
        </div>
      </Layout>
    );
  }

  const isValid = certificateStatus === "VALID";

  return (
    <Layout role="student">
      <PageHeader title={`Welcome, ${student.name}`} eyebrow="Student Dashboard" />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start animate-fade-in-up">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-500">Student Profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard icon={IdCard} label="Student Identification" value={student.student_id} />
              <InfoCard icon={Mail} label="Contact Email" value={student.email} />
              <InfoCard icon={Award} label="Enrolled Specialization" value={student.course_name} />
              <InfoCard 
                icon={ShieldCheck} 
                label="Certificate State" 
                value={certificateStatus} 
                customBadge={
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${isValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {certificateStatus}
                  </span>
                }
              />
            </div>
          </div>

          {/* Enrolled Course Details card */}
          <div className="glass-panel rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-600">
                <Calendar size={18} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Specialization details</h3>
            </div>
            <p className="text-base font-extrabold text-slate-800">{student.course_name}</p>
            <p className="mt-1 text-sm text-slate-500">Includes active certificate issuing, course modules, and QR validation.</p>
          </div>
        </div>

        {/* QR Code / Certificate widget */}
        <aside className="glass-panel rounded-2xl p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
              <QrCode size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Verification Access</h3>
              <p className="text-xs text-slate-400">Scan to verify credentials</p>
            </div>
          </div>

          {certificate ? (
            <div className="text-center">
              <div className="mb-5">
                <span className="inline-flex rounded-full bg-emerald-100/70 border border-emerald-200/50 px-3 py-1 text-xs font-bold text-emerald-800">
                  ACTIVE & VALID
                </span>
              </div>
              <div className="mx-auto w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition hover:scale-[1.02] duration-300">
                <img
                  src={certificate.qr}
                  alt="Certificate QR code"
                  className="aspect-square w-full object-contain"
                />
              </div>
              
              <div className="mt-6 space-y-3">
                <a
                  href={certificate.download_url}
                  download
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-xs font-bold text-white hover:bg-slate-850 transition duration-200 shadow-md shadow-slate-950/10"
                >
                  <Download size={14} />
                  Download Credentials
                </a>
                
                <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
                  <ScanLine size={14} />
                  Verified on official blockchain/database
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50/50 border border-amber-200/30 p-5 text-center">
              <p className="text-sm font-medium text-amber-800">
                Your certificate has not been uploaded yet. Please check back later.
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
    <div className="min-w-0 rounded-xl bg-slate-50/50 border border-slate-100 p-4 hover:bg-slate-50 transition duration-200">
      <div className="mb-1.5 flex items-center gap-2 text-slate-400">
        <Icon className="shrink-0" size={15} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      {customBadge ? (
        <div className="mt-1">{customBadge}</div>
      ) : (
        <p className="break-words font-extrabold text-slate-800">{value || "—"}</p>
      )}
    </div>
  );
}

export default StudentDashboard;
