import { useEffect, useState } from "react";
import { BadgeCheck, Download, FileUp, Files, Upload, AlertCircle } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api, { formatApiError } from "../services/api";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function UploadCertificate() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [zipFile, setZipFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateResult, setTemplateResult] = useState(null);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateProgress, setTemplateProgress] = useState(0);
  const [activeJobId, setActiveJobId] = useState(null);

  useEffect(() => {
    api.get("/accounts/students/").then((response) => setStudents(response.data));
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!studentId || !file) return;

    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("certificate_file", file);

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const response = await api.post("/certificates/upload/", formData);
      setResult(response.data);
      setMessage("Certificate uploaded and secure QR code generated.");

      setStudentId("");
      setFile(null);

      const fileInput = document.getElementById("single-cert-file");
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setMessage(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (event) => {
    event.preventDefault();
    if (!bulkFiles.length && !zipFile) return;

    const formData = new FormData();
    bulkFiles.forEach((certificateFile) => {
      formData.append("certificate_files", certificateFile);
    });
    if (zipFile) {
      formData.append("zip_file", zipFile);
    }

    setBulkLoading(true);
    setBulkMessage("");
    setBulkResult(null);

    try {
      const response = await api.post("/certificates/bulk-upload/", formData);
      setBulkResult(response.data);
      setBulkMessage(
        `Bulk operation complete: ${response.data.created_count} certificates issued, ${response.data.skipped_count} skipped.`
      );
      setBulkFiles([]);
      setZipFile(null);
      
      const bulkFileInput = document.getElementById("bulk-cert-files");
      const zipFileInput = document.getElementById("bulk-zip-file");
      if (bulkFileInput) bulkFileInput.value = "";
      if (zipFileInput) zipFileInput.value = "";
    } catch (err) {
      setBulkMessage(err.response?.data?.error || "Bulk upload failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCancelGeneration = async () => {
    if (!activeJobId) return;

    try {
      await api.post(`/certificates/generation-jobs/${activeJobId}/cancel/`);
      setTemplateMessage("Certificate generation cancelled.");
    } catch (err) {
      setTemplateMessage(formatApiError(err, "Unable to cancel generation"));
    } finally {
      setTemplateLoading(false);
      setActiveJobId(null);
      setTemplateProgress(0);
    }
  };

  const handleTemplateGenerate = async (event) => {
    event.preventDefault();
    if (!templateFile) return;
    if (!students.length) {
      setTemplateMessage("Upload students first before generating certificates.");
      return;
    }

    setTemplateLoading(true);
    setTemplateMessage("Initializing background generator task...");
    setTemplateResult(null);
    setTemplateProgress(0);
    setActiveJobId(null);

    const aggregated = {
      created: [],
      skipped: [],
      created_count: 0,
      skipped_count: 0,
    };

    try {
      const formData = new FormData();
      formData.append("template_file", templateFile);
      formData.append("issue_date", issueDate);
      students.forEach((student) => formData.append("student_ids", student.student_id));
      
      const startResponse = await api.post("/certificates/generation-jobs/", formData);
      const jobId = startResponse.data.job_id;
      setActiveJobId(jobId);

      while (true) {
        const pollResponse = await api.get(`/certificates/generation-jobs/${jobId}/`);
        const job = pollResponse.data;

        aggregated.created.push(...(job.recent_created || []));
        aggregated.skipped.push(...(job.recent_skipped || []));
        aggregated.created_count = job.created_count;
        aggregated.skipped_count = job.skipped_count;
        setTemplateProgress(job.progress_percent || 0);
        setTemplateMessage(
          `Processing credentials: ${job.processed_count} of ${job.total_count} (${job.progress_percent}%)...`
        );

        if (job.status === "completed") {
          aggregated.skipped = job.skipped?.length ? job.skipped : aggregated.skipped;
          break;
        }

        if (job.status === "failed") {
          throw new Error(job.error_message || "Certificate generation failed");
        }

        if (job.status === "cancelled") {
          throw new Error("Certificate generation was cancelled");
        }

        await sleep(400);
      }

      setTemplateResult(aggregated);
      setTemplateMessage(
        `Generation complete: ${aggregated.created_count} certificates generated, ${aggregated.skipped_count} skipped.`
      );
      setTemplateFile(null);
      const templateFileInput = document.getElementById("template-file");
      if (templateFileInput) templateFileInput.value = "";
    } catch (err) {
      if (aggregated.created_count > 0) {
        setTemplateResult(aggregated);
        setTemplateMessage(
          `${aggregated.created_count} generated before failure. ${formatApiError(err, "Template generation failed")}`
        );
      } else {
        setTemplateMessage(formatApiError(err, "Template generation failed"));
      }
    } finally {
      setTemplateLoading(false);
      setActiveJobId(null);
      setTemplateProgress(0);
    }
  };

  return (
    <Layout role="admin">
      <PageHeader title="Issue Certificates" eyebrow="Credential Management" />
      
      {/* Overview stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3 animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered Students</p>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-800 font-display">{students.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Issuing Status</p>
          <p className="mt-1.5 text-sm font-bold text-emerald-600">Online & Ready</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Template Engine</p>
          <p className="mt-1.5 text-sm font-bold text-primary-600">Active (Batch Mode)</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px] items-start animate-fade-in-up">
        {/* Left column: Forms */}
        <div className="space-y-8">
          
          {/* Single Upload Form */}
          <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5 text-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-600">
                <FileUp size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Single Student Upload</h3>
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Student Profile</span>
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-200"
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.student_id} — {student.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Certificate File (PDF, JPG, PNG)</span>
              <input
                type="file"
                id="single-cert-file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200"
              />
            </label>

            <button
              disabled={loading}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-primary-600/15"
            >
              <FileUp size={15} />
              {loading ? "Uploading..." : "Issue & Build QR"}
            </button>

            {message && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">
                {message}
              </div>
            )}
          </form>

          {/* Bulk Upload Form */}
          <form onSubmit={handleBulkUpload} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5 text-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <Files size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Bulk Certificate Upload</h3>
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-xl bg-primary-50/50 border border-primary-100 p-4 text-xs leading-relaxed text-slate-600">
              <AlertCircle size={16} className="text-primary-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-700 mb-1">Filenaming Convention Required</span>
                Name each file with its respective student ID (e.g. <code className="bg-white px-1 py-0.5 rounded border">TSC001.pdf</code> or <code className="bg-white px-1 py-0.5 rounded border">internship_TSC002.png</code>). You can select multiple files or upload a single <code className="bg-white px-1 py-0.5 rounded border">.zip</code> package.
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Select Multiple Certificate Assets</span>
              <input
                type="file"
                id="bulk-cert-files"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(event) => setBulkFiles(Array.from(event.target.files || []))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200"
              />
            </label>

            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Or Upload a ZIP Archive</span>
              <input
                type="file"
                id="bulk-zip-file"
                accept=".zip"
                onChange={(event) => setZipFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200"
              />
            </label>

            <button
              disabled={bulkLoading || (!bulkFiles.length && !zipFile)}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-850 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-slate-950/15"
            >
              <Upload size={15} />
              {bulkLoading ? "Extracting & Uploading..." : "Process Bulk Upload"}
            </button>

            {bulkMessage && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">
                {bulkMessage}
              </div>
            )}
          </form>

          {/* Template Generator Form */}
          <form onSubmit={handleTemplateGenerate} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5 text-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <BadgeCheck size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Generate from PNG/JPG Template</h3>
            </div>

            <div className="mb-6 rounded-xl bg-emerald-50/50 border border-emerald-100 p-4 text-xs leading-relaxed text-emerald-800">
              Upload a high-resolution blank template image. The engine will overlay student parameters and render unique validation credentials in a background loop, keeping server processes light and fast.
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Blank Layout Design (JPG, PNG)</span>
              <input
                type="file"
                id="template-file"
                accept=".jpg,.jpeg,.png"
                onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 transition duration-200"
              />
            </label>

            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Certificate Issue Date</span>
              <input
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-205"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={templateLoading || !templateFile}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-emerald-600/15"
              >
                <BadgeCheck size={15} />
                {templateLoading ? "Rending assets..." : "Generate Batch Certificates"}
              </button>

              {templateLoading && activeJobId && (
                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition duration-200"
                >
                  Cancel Job
                </button>
              )}
            </div>

            {templateLoading && (
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Batch Rendering Progress</span>
                  <span>{templateProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 shimmer-bg transition-all duration-300"
                    style={{ width: `${templateProgress}%` }}
                  />
                </div>
              </div>
            )}

            {templateMessage && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-semibold text-slate-700">
                {templateMessage}
              </div>
            )}
          </form>
        </div>

        {/* Right column: Previews */}
        <aside className="glass-panel rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Generated QR Code</h3>
            <p className="text-xs text-slate-400">Preview issued secure signature QR</p>
          </div>

          {result?.qr ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-full max-w-[200px] rounded-2xl border border-slate-150 bg-white p-4 shadow-sm">
                <img
                  src={result.qr}
                  alt="Generated certificate QR code"
                  className="aspect-square w-full object-contain"
                />
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={result.download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white hover:bg-slate-850 transition duration-200 shadow-md"
                >
                  <Download size={14} />
                  Download File
                </a>

                {result?.verification_url && (
                  <a
                    href={result.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 transition"
                  >
                    Open Live verification page
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-5 text-center text-xs font-semibold text-slate-400 leading-relaxed">
              Upload a certificate or process a layout template to preview the cryptographic signature QR and details.
            </div>
          )}
        </aside>
      </div>

      {/* Results logs */}
      {bulkResult && (
        <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
          <div className="border-b border-slate-100 p-5 bg-slate-50/50">
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Bulk Import Log</h3>
            <p className="text-[10px] text-slate-400">
              Successful imports: {bulkResult.created_count} | Skipped: {bulkResult.skipped_count}
            </p>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Successfully Issued</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-150 divide-y divide-slate-100">
                {bulkResult.created.length ? (
                  bulkResult.created.map((item) => (
                    <div key={`${item.student_id}-${item.file}`} className="flex items-center justify-between gap-3 p-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{item.student_id} — {item.student_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{item.file}</p>
                      </div>
                      <a href={item.download_url} className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 hover:bg-emerald-100 transition">
                        Download
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs font-semibold text-slate-400 text-center">No successful uploads.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700">Skipped (With Warnings)</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-150 divide-y divide-slate-100">
                {bulkResult.skipped.length ? (
                  bulkResult.skipped.map((item) => (
                    <div key={`${item.file}-${item.reason}`} className="p-3 text-xs">
                      <p className="font-bold text-slate-800 truncate">{item.file}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-red-650">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs font-semibold text-slate-400 text-center">No warnings or skips.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {templateResult && (
        <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden animate-fade-in-up">
          <div className="border-b border-slate-100 p-5 bg-slate-50/50">
            <h3 className="text-sm font-bold tracking-tight text-slate-800">Layout Rendering Log</h3>
            <p className="text-[10px] text-slate-400">
              Rendered files: {templateResult.created_count} | Skipped: {templateResult.skipped_count}
            </p>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Generated Documents</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-150 divide-y divide-slate-100">
                {templateResult.created.length ? (
                  templateResult.created.map((item) => (
                    <div key={`${item.student_id}-template`} className="flex items-center justify-between gap-3 p-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{item.student_id} — {item.student_name}</p>
                        <a href={item.verification_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary-650 hover:underline">
                          View Verification Page
                        </a>
                      </div>
                      <a href={item.download_url} className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 hover:bg-emerald-100 transition">
                        Download
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs font-semibold text-slate-400 text-center">No successful renders.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700">Skipped Profiles</h4>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-150 divide-y divide-slate-100">
                {templateResult.skipped.length ? (
                  templateResult.skipped.map((item) => (
                    <div key={`${item.student_id}-${item.reason}`} className="p-3 text-xs">
                      <p className="font-bold text-slate-800 truncate">{item.student_id} — {item.student_name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-red-650">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs font-semibold text-slate-400 text-center">No warnings or skips.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

export default UploadCertificate;
