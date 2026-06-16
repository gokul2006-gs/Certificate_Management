import { useMemo, useState } from "react";
import { Eye, EyeOff, FileUp } from "lucide-react";
import api from "../services/api";
import Layout from "../components/Layout";

export default function CertificateViews() {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [viewData, setViewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch students on mount
  React.useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await api.get("/accounts/students/");
        setStudents(response.data);
      } catch (err) {
        setError("Failed to load students");
      }
    };
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleCheckViews = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError("Please select a student");
      return;
    }

    setLoading(true);
    setError("");
    setViewData(null);

    try {
      const response = await api.get(
        `/certificates/views/${selectedStudentId}/`
      );
      setViewData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load certificate views");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout role="admin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">
          Certificate View Tracking
        </h1>
        <p className="text-slate-500">
          Check which students have viewed issued certificates
        </p>
      </div>

      {/* Student Selection Form */}
      <form
        onSubmit={handleCheckViews}
        className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm"
      >
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">
            Select Student Certificate
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200"
            />
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSearchTerm("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200 mt-3"
            >
              <option value="">Select a student</option>
              {filteredStudents.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.student_id} — {student.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedStudentId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-primary-600/15"
        >
          <Eye size={16} />
          {loading ? "Loading..." : "Check Views"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {viewData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Students
              </p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-800">
                {viewData.total_students}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Viewed
              </p>
              <p className="mt-1.5 text-2xl font-extrabold text-emerald-800">
                {viewData.viewed_count}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Not Viewed
              </p>
              <p className="mt-1.5 text-2xl font-extrabold text-amber-800">
                {viewData.not_viewed_count}
              </p>
            </div>
          </div>

          {/* Viewed Students */}
          {viewData.viewed_students.length > 0 && (
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-emerald-50/50 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Eye size={20} className="text-emerald-600" />
                  Viewed ({viewData.viewed_count})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Viewed At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewData.viewed_students.map((student, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {student.student_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {student.course_name || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-emerald-700 font-semibold">
                          {student.viewed_at
                            ? new Date(student.viewed_at).toLocaleString("en-IN")
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                          {student.ip_address || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Not Viewed Students */}
          {viewData.not_viewed_students.length > 0 && (
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-amber-50/50 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <EyeOff size={20} className="text-amber-600" />
                  Not Viewed ({viewData.not_viewed_count})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewData.not_viewed_students.map((student, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {student.student_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {student.course_name || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            Not Viewed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
