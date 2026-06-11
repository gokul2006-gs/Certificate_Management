import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api from "../services/api";

const emptyForm = { name: "", email: "" };

function Students() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const loadStudents = async () => {
    const response = await api.get("/accounts/students/");
    setStudents(response.data);
  };

  useEffect(() => {
    let active = true;
    api.get("/accounts/students/").then((response) => {
      if (active) {
        setStudents(response.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const term = query.toLowerCase();
    return students.filter((student) =>
      [student.student_id, student.name, student.email, student.course_name]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [students, query]);

  const selectedCount = selectedStudentIds.length;
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedStudentIds.includes(student.student_id));

  const handleCreate = async (event) => {
    event.preventDefault();
    await api.post("/accounts/students/", form);
    setForm(emptyForm);
    setMessage("Student created successfully (default password: Tech@123)");
    loadStudents();
  };

  const startEdit = (student) => {
    setEditingId(student.student_id);
    setEditForm({ name: student.name, email: student.email });
  };

  const saveEdit = async (studentId) => {
    await api.put(`/accounts/students/${studentId}/`, editForm);
    setEditingId("");
    setMessage("Student registration updated");
    loadStudents();
  };

  const deleteStudent = async (studentId) => {
    const confirmed = window.confirm(`Delete student ${studentId}?`);
    if (!confirmed) return;
    await api.delete(`/accounts/students/${studentId}/`);
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    setMessage("Student registration deleted");
    loadStudents();
  };

  const toggleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredStudents.map((student) => student.student_id));
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.has(id)));
      return;
    }

    const merged = new Set(selectedStudentIds);
    filteredStudents.forEach((student) => merged.add(student.student_id));
    setSelectedStudentIds(Array.from(merged));
  };

  const deleteSelectedStudents = async () => {
    if (!selectedCount) return;
    const confirmed = window.confirm(`Delete ${selectedCount} selected students?`);
    if (!confirmed) return;

    await api.post("/accounts/students/bulk-delete/", {
      student_ids: selectedStudentIds,
    });
    setSelectedStudentIds([]);
    setMessage(`${selectedCount} students successfully deleted`);
    loadStudents();
  };

  return (
    <Layout role="admin">
      <PageHeader title="Students" eyebrow="Registry Management" />

      {/* Creation form */}
      <section className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Add New Registration</h3>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            placeholder="Full Name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all duration-200"
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
            placeholder="Email Address"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all duration-200"
          />
          <button className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white hover:bg-slate-850 active:scale-[0.98] transition duration-200 shadow-md shadow-slate-950/15">
            <Plus size={16} />
            Register Student
          </button>
        </form>
        {message && (
          <div className="mt-4 rounded-xl bg-primary-50 border border-primary-100 p-4 text-xs font-semibold text-primary-700">
            {message}
          </div>
        )}
      </section>

      {/* Registry Database view */}
      <section className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Student Database</h3>
            <p className="text-[10px] text-slate-400">Total profiles: {filteredStudents.length}</p>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search database..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 sm:w-64"
              />
            </label>
            <button
              onClick={deleteSelectedStudents}
              disabled={!selectedCount}
              className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-md shadow-red-600/10"
            >
              <Trash2 size={14} />
              Delete ({selectedCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-12">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Select all students"
                  />
                </th>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Course Specialization</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center font-medium text-slate-400">
                    No students matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.student_id)}
                        onChange={() => toggleSelectStudent(student.student_id)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Select ${student.student_id}`}
                      />
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{student.student_id}</td>
                    <td className="px-5 py-3.5">
                      {editingId === student.student_id ? (
                        <input
                          value={editForm.name}
                          onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-primary-500"
                        />
                      ) : student.name}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === student.student_id ? (
                        <input
                          value={editForm.email}
                          onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-primary-500"
                        />
                      ) : student.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {student.course_name || "Unenrolled"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        {editingId === student.student_id ? (
                          <>
                            <button title="Save" onClick={() => saveEdit(student.student_id)} className="rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-2 text-emerald-700 transition">
                              <Save size={15} />
                            </button>
                            <button title="Cancel" onClick={() => setEditingId("")} className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 p-2 text-slate-600 transition">
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button title="Edit" onClick={() => startEdit(student)} className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-150 p-2 text-slate-600 transition">
                              <Pencil size={15} />
                            </button>
                            <button title="Delete" onClick={() => deleteStudent(student.student_id)} className="rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 p-2 text-red-700 transition">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
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

export default Students;
