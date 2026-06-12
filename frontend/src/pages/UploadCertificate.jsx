import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Download, FileUp, Files, Upload, AlertCircle } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api, { formatApiError } from "../services/api";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function UploadCertificate() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [zipFile, setZipFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateResult, setTemplateResult] = useState(null);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCourse, setSelectedCourse] = useState("");
  const [message, setMessage] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateProgress, setTemplateProgress] = useState(0);
  const [activeJobId, setActiveJobId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/accounts/students/"),
      api.get("/courses/"),
    ]).then(([sRes, cRes]) => {
      setStudents(sRes.data);
      setCourses(cRes.data);
    });
  }, []);

  const selectedCourseName = useMemo(() => {
    if (!selectedCourse) return "";
    return courses.find((c) => c.id === selectedCourse)?.course_name || "";
  }, [selectedCourse, courses]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!studentId || !file) return;
    const fd = new FormData();
    fd.append("student_id", studentId);
    fd.append("certificate_file", file);
    fd.append("issue_date", issueDate);
    setLoading(true); setMessage(""); setResult(null);
    try {
      const r = await api.post("/certificates/upload/", fd);
      setResult(r.data);
      setMessage("Certificate generated successfully.");
      setStudentId(""); setFile(null);
      const fi = document.getElementById("single-cert-file");
      if (fi) fi.value = "";
    } catch (err) {
      setMessage(err.response?.data?.error || "Upload failed");
    } finally { setLoading(false); }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFiles.length && !zipFile) return;
    const fd = new FormData();
    bulkFiles.forEach((f) => fd.append("certificate_files", f));
    if (zipFile) fd.append("zip_file", zipFile);
    setBulkLoading(true); setBulkMessage(""); setBulkResult(null);
    try {
      const r = await api.post("/certificates/bulk-upload/", fd);
      setBulkResult(r.data);
      setBulkMessage(`Bulk complete: ${r.data.created_count} issued, ${r.data.skipped_count} skipped.`);
      setBulkFiles([]); setZipFile(null);
      const bf = document.getElementById("bulk-cert-files");
      const zf = document.getElementById("bulk-zip-file");
      if (bf) bf.value = ""; if (zf) zf.value = "";
    } catch (err) { setBulkMessage(err.response?.data?.error || "Bulk upload failed"); }
    finally { setBulkLoading(false); }
  };

  const handleCancelGeneration = async () => {
    if (!activeJobId) return;
    try {
      await api.post(`/certificates/generation-jobs/${activeJobId}/cancel/`);
      setTemplateMessage("Generation cancelled.");
    } catch (err) { setTemplateMessage(formatApiError(err, "Unable to cancel")); }
    finally { setTemplateLoading(false); setActiveJobId(null); setTemplateProgress(0); }
  };

  const handleTemplateGenerate = async (e) => {
    e.preventDefault();
    if (!templateFile) return;
    if (!students.length) { setTemplateMessage("Upload students first."); return; }
    setTemplateLoading(true); setTemplateMessage("Starting generation job..."); setTemplateResult(null); setTemplateProgress(0); setActiveJobId(null);
    const aggregated = { created: [], skipped: [], created_count: 0, skipped_count: 0 };
    try {
      const fd = new FormData();
      fd.append("template_file", templateFile);
      fd.append("issue_date", issueDate);
      if (selectedCourseName) fd.append("course_name", selectedCourseName);
      const start = await api.post("/certificates/generation-jobs/", fd);
      const jobId = start.data.job_id;
      setActiveJobId(jobId);
      while (true) {
        const poll = await api.get(`/certificates/generation-jobs/${jobId}/`);
        const job = poll.data;
        aggregated.created.push(...(job.recent_created || []));
        aggregated.skipped.push(...(job.recent_skipped || []));
        aggregated.created_count = job.created_count;
        aggregated.skipped_count = job.skipped_count;
        setTemplateProgress(job.progress_percent || 0);
        setTemplateMessage(`Processing: ${job.processed_count} of ${job.total_count} (${job.progress_percent}%)...`);
        if (job.status === "completed") { aggregated.skipped = job.skipped?.length ? job.skipped : aggregated.skipped; break; }
        if (job.status === "failed") throw new Error(job.error_message || "Generation failed");
        if (job.status === "cancelled") throw new Error("Generation cancelled");
        await sleep(400);
      }
      setTemplateResult(aggregated);
      setTemplateMessage(`Done: ${aggregated.created_count} generated, ${aggregated.skipped_count} skipped.`);
      setTemplateFile(null);
      const tfi = document.getElementById("template-file");
      if (tfi) tfi.value = "";
    } catch (err) {
      if (aggregated.created_count > 0) { setTemplateResult(aggregated); setTemplateMessage(`${aggregated.created_count} generated before failure. ${formatApiError(err, "")}`); }
      else setTemplateMessage(formatApiError(err, "Template generation failed"));
    } finally { setTemplateLoading(false); setActiveJobId(null); setTemplateProgress(0); }
  };

  return (
    <Layout role="admin">
      <PageHeader title="Issue Certificates" eyebrow="Credential Management" />

      <div className="mb-8 grid gap-4 sm:grid-cols-3 animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-800 font-display">{students.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Courses</p>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-800 font-display">{courses.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Template Engine</p>
          <p className="mt-1.5 text-sm font-bold text-primary-600">Active (Batch Mode)</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px] items-start animate-fade-in-up">
        <div className="space-y-8">

          {/* Batch Generate from Template */}
          <form onSubmit={handleTemplateGenerate} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5 text-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <BadgeCheck size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Generate Certificates from Template</h3>
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Certificate Template (JPG, PNG)</span>
              <input type="file" id="template-file" accept=".jpg,.jpeg,.png"
                onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200" />
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Issue Date</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200" />
            </label>

            <label className="mb-2 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Course Name on Certificate <span className="text-red-500">*</span>
              </span>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200">
                <option value="">— Select a course —</option>
                {["Technical","Basic","Non-Technical","Graphic Designing","Development Services"].map((type) => {
                  const group = courses.filter((c) => c.course_type === type);
                  if (!group.length) return null;
                  return (
                    <optgroup key={type} label={type}>
                      {group.map((c) => (
                        <option key={c.id} value={c.id}>{c.course_name}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            {selectedCourseName && (
              <p className="mb-5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                Certificate will show: <span className="font-bold">{selectedCourseName}</span> — for all {students.length} students
              </p>
            )}
            {!selectedCourseName && (
              <p className="mb-5 text-[11px] text-slate-400">Select a course to print on every certificate.</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button disabled={templateLoading || !templateFile || !selectedCourse}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-emerald-600/15">
                <BadgeCheck size={15} />
                {templateLoading ? "Generating..." : `Generate Certificates`}
              </button>
              {templateLoading && activeJobId && (
                <button type="button" onClick={handleCancelGeneration}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition duration-200">
                  Cancel
                </button>
              )}
            </div>

            {templateLoading && (
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Progress</span><span>{templateProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-600 transition-all duration-300" style={{ width: `${templateProgress}%` }} />
                </div>
              </div>
            )}
            {templateMessage && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">{templateMessage}</div>
            )}
          </form>

          {/* Single Upload */}
          <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5 text-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-600"><FileUp size={16} /></div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Single Student Certificate</h3>
            </div>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Student</span>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200">
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.student_id} — {s.name} ({s.course_name})</option>
                ))}
              </select>
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Template File (JPG, PNG)</span>
              <input type="file" id="single-cert-file" accept=".jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)} required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200" />
            </label>
            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Issue Date</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200" />
            </label>
            <button disabled={loading}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-primary-600/15">
              <FileUp size={15} />{loading ? "Generating..." : "Generate & Issue"}
            </button>
            {message && <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">{message}</div>}
          </form>

          {/* Bulk Upload */}
          <form onSubmit={handleBulkUpload} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5 text-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Files size={16} /></div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Bulk Certificate Upload</h3>
            </div>
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-primary-50/50 border border-primary-100 p-4 text-xs leading-relaxed text-slate-600">
              <AlertCircle size={16} className="text-primary-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-700 mb-1">Filenaming Convention Required</span>
                Name each file with its student ID e.g. <code className="bg-white px-1 py-0.5 rounded border">TSC001.png</code>
              </div>
            </div>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Select Multiple Certificate Files</span>
              <input type="file" id="bulk-cert-files" accept=".pdf,.jpg,.jpeg,.png" multiple
                onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200" />
            </label>
            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Or Upload a ZIP Archive</span>
              <input type="file" id="bulk-zip-file" accept=".zip"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200" />
            </label>
            <button disabled={bulkLoading || (!bulkFiles.length && !zipFile)}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md">
              <Upload size={15} />{bulkLoading ? "Uploading..." : "Process Bulk Upload"}
            </button>
            {bulkMessage && <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">{bulkMessage}</div>}
          </form>
        </div>

        {/* Right panel */}
        <aside className="glass-panel rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Generated QR Code</h3>
            <p className="text-xs text-slate-400">Preview issued QR signature</p>
          </div>
          {result?.qr ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-full max-w-[200px] rounded-2xl border border-slate-150 bg-white p-4 shadow-sm">
                <img src={result.qr} alt="QR code" className="aspect-square w-full object-contain" />
              </div>
              <div className="space-y-3 pt-2">
                <a href={result.download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 transition duration-200 shadow-md">
                  <Download size={14} /> Download Certificate
                </a>
                {result?.verification_url && (
                  <a href={result.verification_url} target="_blank" rel="noreferrer"
                    className="block text-xs font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 transition">
                    Open Verification Page
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-5 text-center text-xs font-semibold text-slate-400 leading-relaxed">
              Generate or upload a certificate to preview the QR code.
            </div>
          )}
        </aside>
      </div>

      {bulkResult && (
        <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
          <div className="border-b border-slate-100 p-5 bg-slate-50/50">
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Bulk Import Log</h3>
            <p className="text-[10px] text-slate-400">Issued: {bulkResult.created_count} | Skipped: {bulkResult.skipped_count}</p>
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Issued</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                {bulkResult.created.length ? bulkResult.created.map((item) => (
                  <div key={`${item.student_id}-${item.file}`} className="flex items-center justify-between gap-3 p-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.student_id} — {item.student_name}</p>
                    </div>
                    <a href={item.download_url} className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 hover:bg-emerald-100 transition">Download</a>
                  </div>
                )) : <p className="p-4 text-xs text-slate-400 text-center">None.</p>}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700">Skipped</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                {bulkResult.skipped.length ? bulkResult.skipped.map((item) => (
                  <div key={`${item.file}-${item.reason}`} className="p-3 text-xs">
                    <p className="font-bold text-slate-800 truncate">{item.file}</p>
                    <p className="mt-0.5 text-[10px] text-red-600 font-semibold">{item.reason}</p>
                  </div>
                )) : <p className="p-4 text-xs text-slate-400 text-center">None.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {templateResult && (
        <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
          <div className="border-b border-slate-100 p-5 bg-slate-50/50">
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Generation Log</h3>
            <p className="text-[10px] text-slate-400">Generated: {templateResult.created_count} | Skipped: {templateResult.skipped_count}</p>
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Generated</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                {templateResult.created.length ? templateResult.created.map((item) => (
                  <div key={`${item.student_id}-template`} className="flex items-center justify-between gap-3 p-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.student_id} — {item.student_name}</p>
                      <a href={item.verification_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary-600 hover:underline">Verify</a>
                    </div>
                    <a href={item.download_url} className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 hover:bg-emerald-100 transition">Download</a>
                  </div>
                )) : <p className="p-4 text-xs text-slate-400 text-center">None.</p>}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700">Skipped</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                {templateResult.skipped.length ? templateResult.skipped.map((item) => (
                  <div key={`${item.student_id}-${item.reason}`} className="p-3 text-xs">
                    <p className="font-bold text-slate-800 truncate">{item.student_id} — {item.student_name}</p>
                    <p className="mt-0.5 text-[10px] text-red-600 font-semibold">{item.reason}</p>
                  </div>
                )) : <p className="p-4 text-xs text-slate-400 text-center">None.</p>}
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

export default UploadCertificate;











