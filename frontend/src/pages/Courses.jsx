import { useEffect, useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api, { formatApiError } from "../services/api";

const emptyForm = { course_name: "", duration: "" };

function Courses() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCourses = async () => {
    try {
      const response = await api.get("/courses/");
      setCourses(response.data);
    } catch (err) {
      setErrorMessage(formatApiError(err, "Failed to load courses. Please log in again."));
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const term = query.toLowerCase();
    return courses.filter((course) =>
      [course.course_name, course.duration]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [courses, query]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      await api.post("/courses/", form);
      setForm(emptyForm);
      setMessage("Course created successfully!");
      loadCourses();
    } catch (err) {
      setErrorMessage(formatApiError(err, "Failed to create course."));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (course) => {
    setEditingId(course.id);
    setEditForm({ course_name: course.course_name, duration: course.duration });
  };

  const saveEdit = async (courseId) => {
    setMessage("");
    setErrorMessage("");
    try {
      await api.put(`/courses/${courseId}/`, editForm);
      setEditingId("");
      setMessage("Course details updated.");
      loadCourses();
    } catch (err) {
      setErrorMessage(formatApiError(err, "Failed to update course."));
    }
  };

  const deleteCourse = async (course) => {
    const confirmed = window.confirm(`Are you sure you want to delete the course "${course.course_name}"?`);
    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");
    try {
      await api.delete(`/courses/${course.id}/`);
      setMessage("Course deleted successfully.");
      loadCourses();
    } catch (err) {
      setErrorMessage(formatApiError(err, "Failed to delete course."));
    }
  };

  return (
    <Layout role="admin">
      <PageHeader title="Courses" eyebrow="Academic Directory" />

      {/* Course Creation Form */}
      <section className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-scale-in border-l-4 border-l-primary-500">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Add New Program / Course</h3>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={form.course_name}
            onChange={(event) => setForm({ ...form, course_name: event.target.value })}
            required
            placeholder="Course Name (e.g. Full Stack Development)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 hover:scale-[1.005] focus:scale-[1.005] transition-all duration-200"
          />
          <input
            value={form.duration}
            onChange={(event) => setForm({ ...form, duration: event.target.value })}
            required
            placeholder="Duration (e.g. 6 Months)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 hover:scale-[1.005] focus:scale-[1.005] transition-all duration-200"
          />
          <button 
            disabled={loading}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white hover:bg-slate-850 hover:scale-[1.02] active:scale-[0.98] transition duration-200 shadow-md shadow-slate-950/15"
          >
            <Plus size={16} />
            {loading ? "Adding..." : "Add Course"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-700 animate-fade-in">
            {message}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200/50 p-4 text-xs font-semibold text-red-700 animate-fade-in">
            {errorMessage}
          </div>
        )}
      </section>

      {/* Courses Database view */}
      <section className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-scale-in [animation-delay:150ms]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Study Programs Directory</h3>
            <p className="text-[10px] text-slate-400">Total programs: {filteredCourses.length}</p>
          </div>
          
          <div>
            <label className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search programs..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:scale-[1.01] focus:scale-[1.01] transition-all duration-200 sm:w-64"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-16">#</th>
                <th className="px-5 py-3.5">Course Name</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Registered Students</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center font-medium text-slate-400">
                    No programs registered in the system.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course, index) => (
                  <tr key={course.id} className="hover:bg-slate-50/50 transition-all duration-200">
                    <td className="px-5 py-3.5 text-slate-400">{index + 1}</td>
                    <td className="px-5 py-3.5">
                      {editingId === course.id ? (
                        <input
                          value={editForm.course_name}
                          onChange={(event) => setEditForm({ ...editForm, course_name: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                        />
                      ) : (
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <BookOpen size={14} className="text-slate-400" />
                          {course.course_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === course.id ? (
                        <input
                          value={editForm.duration}
                          onChange={(event) => setEditForm({ ...editForm, duration: event.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                        />
                      ) : (
                        <span className="font-semibold text-slate-650">{course.duration}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        course.student_count > 0 ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {course.student_count} Registered
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        {editingId === course.id ? (
                          <>
                            <button 
                              title="Save" 
                              onClick={() => saveEdit(course.id)} 
                              className="rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-105 p-2 text-emerald-700 hover:scale-[1.05] active:scale-[0.95] transition"
                            >
                              <Save size={15} />
                            </button>
                            <button 
                              title="Cancel" 
                              onClick={() => setEditingId("")} 
                              className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-105 p-2 text-slate-600 hover:scale-[1.05] active:scale-[0.95] transition"
                            >
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              title="Edit" 
                              onClick={() => startEdit(course)} 
                              className="rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-150 p-2 text-slate-600 hover:scale-[1.05] active:scale-[0.95] transition"
                            >
                              <Pencil size={15} />
                            </button>
                            <button 
                              title="Delete" 
                              onClick={() => deleteCourse(course)} 
                              className="rounded-lg bg-red-50 hover:bg-red-105 border border-red-100 p-2 text-red-700 hover:scale-[1.05] active:scale-[0.95] transition"
                            >
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

export default Courses;
