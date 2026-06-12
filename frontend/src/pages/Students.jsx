import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api, { formatApiError } from "../services/api";

function Students() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [message, setMessage] = useState("");

  const load = async () => {
    const r = await api.get("/accounts/students/");
    setStudents(r.data);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = query.toLowerCase();
    return students.filter((s) =>
      [s.student_id, s.name, s.email].join(" ").toLowerCase().includes(t)
    );
  }, [students, query]);

  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.includes(s.student_id));

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/accounts/students/", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      });
      setForm({ name: "", email: "" });
      setMessage("Student registered. Default password: Tech@123");
      load();
    } catch (err) {
      setMessage(formatApiError(err, "Could not create student"));
    }
  };

  const startEdit = (s) => { setEditingId(s.student_id); setEditForm({ name: s.name, email: s.email }); };

  const saveEdit = async (id) => {
    setMessage("");
    try {
      await api.put(`/accounts/students/${id}/`, { name: editForm.name.trim(), email: editForm.email.trim().toLowerCase() });
      setEditingId(""); setMessage("Student updated."); load();
    } catch (err) { setMessage(formatApiError(err, "Could not update student")); }
  };

  const deleteOne = async (id) => {
    if (!window.confirm(`Delete student ${id}?`)) return;
    await api.delete(`/accounts/students/${id}/`);
    setSelectedIds((p) => p.filter((x) => x !== id));
    setMessage("Student deleted."); load();
  };

  const toggleSelect = (id) => setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () => {
    if (allSelected) { const s = new Set(filtered.map((x) => x.student_id)); setSelectedIds((p) => p.filter((x) => !s.has(x))); }
    else { const m = new Set(selectedIds); filtered.forEach((x) => m.add(x.student_id)); setSelectedIds(Array.from(m)); }
  };

  const deleteBulk = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} students?`)) return;
    await api.post("/accounts/students/bulk-delete/", { student_ids: selectedIds });
    setSelectedIds([]); setMessage(`${selectedIds.length} students deleted.`); load();
  };

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200";
  const editCls = "w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-primary-500";

  return (
    <Layout role="admin">
      <PageHeader title="Students" eyebrow="Registry Management" />

      <section className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up border-l-4 border-l-primary-500">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Add New Registration</h3>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
          <input value={form.name} required placeholder="Full Name"
            onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input type="email" value={form.email} required placeholder="Email Address"
            onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          <button className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition duration-200 shadow-md">
            <Plus size={16} /> Register
          </button>
        </form>
        {message && (
          <div className={`mt-4 rounded-xl border p-4 text-xs font-semibold ${message.includes("not") || message.includes("Could") ? "border-red-100 bg-red-50 text-red-700" : "border-primary-100 bg-primary-50 text-primary-700"}`}>
            {message}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Student Database</h3>
            <p className="text-[10px] text-slate-400">{filtered.length} profiles</p>
          </div>
          <div className="flex gap-3 items-center">
            <label className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..."
                className="rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-primary-500 transition-all duration-200 w-56" />
            </label>
            <button onClick={deleteBulk} disabled={!selectedIds.length}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition">
              <Trash2 size={14} /> Delete ({selectedIds.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-12">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300 text-primary-600" />
                </th>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center font-medium text-slate-400">No students found.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.student_id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-3.5">
                    <input type="checkbox" checked={selectedIds.includes(s.student_id)} onChange={() => toggleSelect(s.student_id)} className="rounded border-slate-300 text-primary-600" />
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{s.student_id}</td>
                  <td className="px-5 py-3.5">
                    {editingId === s.student_id
                      ? <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={editCls} />
                      : s.name}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === s.student_id
                      ? <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={editCls} />
                      : s.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      {editingId === s.student_id ? (
                        <>
                          <button onClick={() => saveEdit(s.student_id)} className="rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-2 text-emerald-700 transition"><Save size={14} /></button>
                          <button onClick={() => setEditingId("")} className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 text-slate-600 transition"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(s)} className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 text-slate-600 transition"><Pencil size={14} /></button>
                          <button onClick={() => deleteOne(s.student_id)} className="rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 p-2 text-red-700 transition"><Trash2 size={14} /></button>
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
