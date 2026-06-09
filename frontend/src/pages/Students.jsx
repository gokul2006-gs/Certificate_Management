import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api, { getCsrfToken } from "../services/api";

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
    await getCsrfToken();
    await api.post("/accounts/students/", form);
    setForm(emptyForm);
    setMessage("Student created with default password Tech@123");
    loadStudents();
  };

  const startEdit = (student) => {
    setEditingId(student.student_id);
    setEditForm({ name: student.name, email: student.email });
  };

  const saveEdit = async (studentId) => {
    await getCsrfToken();
    await api.put(`/accounts/students/${studentId}/`, editForm);
    setEditingId("");
    setMessage("Student updated");
    loadStudents();
  };

  const deleteStudent = async (studentId) => {
    const confirmed = window.confirm(`Delete student ${studentId}?`);
    if (!confirmed) return;
    await getCsrfToken();
    await api.delete(`/accounts/students/${studentId}/`);
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    setMessage("Student deleted");
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

    await getCsrfToken();
    await api.post("/accounts/students/bulk-delete/", {
      student_ids: selectedStudentIds,
    });
    setSelectedStudentIds([]);
    setMessage(`${selectedCount} students deleted`);
    loadStudents();
  };

  return (
    <Layout role="admin">
      <PageHeader title="Students" eyebrow="Student Registry" />

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            placeholder="Student name"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600"
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
            placeholder="Email address"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-600"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            <Plus size={18} />
            Add Student
          </button>
        </form>
        {message && <p className="mt-3 text-sm font-medium text-cyan-700">{message}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-slate-950">All Students</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students"
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-cyan-600 sm:w-72"
              />
            </label>
            <button
              onClick={deleteSelectedStudents}
              disabled={!selectedCount}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Trash2 size={16} />
              Delete Selected ({selectedCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Select all students"
                  />
                </th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.student_id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.student_id)}
                      onChange={() => toggleSelectStudent(student.student_id)}
                      aria-label={`Select ${student.student_id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{student.student_id}</td>
                  <td className="px-4 py-3">
                    {editingId === student.student_id ? (
                      <input
                        value={editForm.name}
                        onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    ) : student.name}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === student.student_id ? (
                      <input
                        value={editForm.email}
                        onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    ) : student.email}
                  </td>
                  <td className="px-4 py-3">{student.course_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === student.student_id ? (
                        <>
                          <button title="Save" onClick={() => saveEdit(student.student_id)} className="rounded-lg bg-cyan-100 p-2 text-cyan-700 hover:bg-cyan-200">
                            <Save size={17} />
                          </button>
                          <button title="Cancel" onClick={() => setEditingId("")} className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">
                            <X size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button title="Edit" onClick={() => startEdit(student)} className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">
                            <Pencil size={17} />
                          </button>
                          <button title="Delete" onClick={() => deleteStudent(student.student_id)} className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100">
                            <Trash2 size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

export default Students;
