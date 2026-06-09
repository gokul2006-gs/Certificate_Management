import { useEffect, useState } from "react";
import { Award, IdCard, Mail, QrCode, ScanLine, Timer } from "lucide-react";
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
        <p className="rounded-lg bg-white p-5 shadow-sm">{message || "Loading profile..."}</p>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <PageHeader title={`Welcome, ${student.name}`} eyebrow="Student Dashboard" />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">Profile Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={IdCard} label="Student ID" value={student.student_id} />
              <Info icon={Mail} label="Email" value={student.email} />
              <Info icon={Award} label="Course" value={student.course_name} />
              <Info icon={Timer} label="Certificate Status" value={certificateStatus} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold text-slate-950">Enrolled Course Details</h3>
            <p className="text-slate-600">{student.course_name}</p>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
              <QrCode size={22} />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-950">Certificate QR</h3>
              <p className="text-sm text-slate-500">Scan to view your certificate</p>
            </div>
          </div>
          {certificate ? (
            <div className="text-center">
              <span className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                VALID
              </span>
              <div className="mx-auto w-full max-w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <img
                  src={certificate.qr}
                  alt="Certificate verification QR code"
                  className="aspect-square w-full object-contain"
                />
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <ScanLine size={17} />
                Certificate opens after QR scan
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Your certificate has not been uploaded yet.
            </p>
          )}
        </aside>
      </section>
    </Layout>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <Icon className="shrink-0" size={17} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default StudentDashboard;
