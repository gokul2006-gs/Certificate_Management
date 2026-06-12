import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api, { formatApiError } from "../services/api";

const COURSE_TYPES = [
  "Technical",
  "Basic",
  "Non-Technical",
  "Graphic Designing",
  "Development Services",
];

const TYPE_COLORS = {
  "Technical":            "bg-blue-50 text-blue-700 border-blue-100",
  "Basic":                "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Non-Technical":        "bg-amber-50 text-amber-700 border-amber-100",
  "Graphic Designing":    "bg-purple-50 text-purple-700 border-purple-100",
  "Development Services": "bg-rose-50 text-rose-700 border-rose-100",
};

const emptyForm = { course_name: "", duration: "", course_type: "Technical" };

function Courses() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const loadCourses = async () => {
    try {
      const r = await api.get("/courses/");
      setCourses(r.data);
    } catch (err) {
      setErrorMessage(formatApiError(err, "Failed to load courses."));
    }
  };

  useEffect(() => { loadCourses(); }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return courses.filter((c) =>
      [c.course_name, c.duration, c.course_type].join(" ").toLowerCase().includes(term)
    );
  }, [courses, query]);

  const grouped = useMemo(() => {
    const map = {};
    COURSE_TYPES.forEach((t) => { map[t] = []; });
    filtered.forEach((c) => {
      const key = c.course_type || "Technical";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [filtered]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage(""); setErrorMessage(""); setLoading(true);
    try {
      await api.post("/courses/", form);
      setForm(emptyForm);
      setMessage("Course added.");
      loadCourses();
    } catch (err) {
      setErrorMessage(formatApiError(err, "Failed to create course."));
    } finally { setLoading(false); }
  };

  const startEdit = (course) => {
    setEditingId(course.id);
    setEditForm({ course_name: course.course_name, duration: course.duration, course_type: course.course_type || "Technical" });
  };

  const saveEdit = async (id) => {
    setMessage(""); setErrorMessage("");
    try {
      await api.put(`/courses/${id}/`, editForm);
      setEditingId("");
      setMessage("Course updated.");
      loadCourses();
    } catch (err) { setErrorMessage(formatApiError(err, "Failed to update.")); }
  };

  const deleteCourse = async (course) => {
    if (!window.confirm(`Delete "${course.course_name}"?`)) return;
    setMessage(""); setErrorMessage("");
    try {
      await api.delete(`/courses/${course.id}/`);
      setMessage("Course deleted.");
      loadCourses();
    } catch (err) { setErrorMessage(formatApiError(err, "Failed to delete.")); }
  };

  const toggleCollapse = (type) => setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));

  return (
    <Layout role="admin">
      <PageHeader title="Courses" eyebrow="Academic Directory" />

      {/* Add Course Form */}
      <section className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-scale-in border-l-4 border-l-primary-500">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Add New Course</h3>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input value={form.course_name} required
            onChange={(e) => setForm({ ...form, course_name: e.target.value })}
            placeholder="Course Name"
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200" />
          <input value={form.duration} required
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            placeholder="Duration (e.g. 3 Months)"
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200" />
          <select value={form.course_type} onChange={(e) => setForm({ ...form, course_type: e.target.value })}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200">
            {COURSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button disabled={loading}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition duration-200 shadow-md">
            <Plus size={16} />{loading ? "Adding..." : "Add"}
          </button>
        </form>
        {message && <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-700">{message}</div>}
        {errorMessage && <div className="mt-4 rounded-xl bg-red-50 border border-red-200/50 p-4 text-xs font-semibold text-red-700">{errorMessage}</div>}
      </section>

      {/* Search + Summary */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-slate-400">{filtered.length} courses available</p>
        <label className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-primary-500 transition-all duration-200 w-64" />
        </label>
      </div>

      {/* Grouped Course Lists */}
      <div className="space-y-6">
        {COURSE_TYPES.map((type) => {
          const list = grouped[type] || [];
          if (list.length === 0 && !query) return null;
          const isOpen = !collapsed[type];
          return (
            <section key={type} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <button type="button" onClick={() => toggleCollapse(type)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 p-5 bg-slate-50/50 hover:bg-slate-100/60 transition">
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[type] || "bg-slate-100 text-slate-600"}`}>
                    {type}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{list.length} course{list.length !== 1 ? "s" : ""}</span>
                </div>
                {isOpen ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
              </button>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 w-10">#</th>
                        <th className="px-5 py-3">Course Name</th>
                        <th className="px-5 py-3">Duration</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {list.length === 0 ? (
                        <tr><td colSpan={4} className="px-5 py-6 text-center font-medium text-slate-400">No courses in this category.</td></tr>
                      ) : list.map((course, idx) => (
                        <tr key={course.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-5 py-3">
                            {editingId === course.id ? (
                              <input value={editForm.course_name}
                                onChange={(e) => setEditForm({ ...editForm, course_name: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-primary-500" />
                            ) : (
                              <div className="flex items-center gap-2 font-bold text-slate-800">
                                <BookOpen size={13} className="text-slate-400 shrink-0" />
                                {course.course_name}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {editingId === course.id ? (
                              <input value={editForm.duration}
                                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                                className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-primary-500" />
                            ) : (
                              <span className="font-semibold text-slate-600">{course.duration}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2">
                              {editingId === course.id ? (
                                <>
                                  <button title="Save" onClick={() => saveEdit(course.id)}
                                    className="rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-2 text-emerald-700 transition">
                                    <Save size={14} />
                                  </button>
                                  <button title="Cancel" onClick={() => setEditingId("")}
                                    className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 text-slate-600 transition">
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button title="Edit" onClick={() => startEdit(course)}
                                    className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 text-slate-600 transition">
                                    <Pencil size={14} />
                                  </button>
                                  <button title="Delete" onClick={() => deleteCourse(course)}
                                    className="rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 p-2 text-red-700 transition">
                                    <Trash2 size={14} />
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
              )}
            </section>
          );
        })}
      </div>
    </Layout>
  );
}

export default Courses;
