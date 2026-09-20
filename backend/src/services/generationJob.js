import { CertificateGenerationJob } from "../models/CertificateGenerationJob.js";
import { Student } from "../models/Student.js";
import { renderCertificateImage, formatIssueRange } from "../utils/certificateImage.js";
import { issueCertificate } from "../utils/certificates.js";

const BATCH = 1;

async function loadTemplateBuffer(url) {
  if (url.startsWith("/api/files/")) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const { env } = await import("../config/env.js");
    const key = url.replace("/api/files/", "");
    return fs.readFile(path.join(env.uploadRoot, key));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load certificate template");
  return Buffer.from(await response.arrayBuffer());
}

export async function processGenerationJob(jobId) {
  const job = await CertificateGenerationJob.findById(jobId);
  if (!job) return;
  if (["completed", "failed", "cancelled"].includes(job.status)) return;

  try {
    const templateBuffer = await loadTemplateBuffer(job.templateFileUrl);
    job.status = "processing";
    await job.save();

    while (job.processedCount < job.studentIds.length) {
      const fresh = await CertificateGenerationJob.findById(job.id);
      if (!fresh || fresh.cancelRequested || fresh.status === "cancelled") {
        job.status = "cancelled";
        job.completedAt = new Date();
        await job.save();
        return;
      }

      const batchIds = job.studentIds.slice(job.processedCount, job.processedCount + BATCH);
      const recentCreated = [];
      const recentSkipped = [];

      for (const studentId of batchIds) {
        const student = await Student.findOne({ studentId });
        if (!student) {
          recentSkipped.push({ student_id: studentId, student_name: studentId, reason: "Student not found" });
          continue;
        }
        try {
          const issueLabel = formatIssueRange(job.startDate, job.endDate, job.issueDate);
          const rendered = await renderCertificateImage(templateBuffer, {
            name: student.name,
            courseName: job.courseName,
            issueDate: issueLabel,
            fields: job.fields,
          });
          const issued = await issueCertificate({
            student,
            fileBuffer: rendered,
            filename: `${student.studentId}.png`,
            mime: "image/png",
            courseName: job.courseName,
            issueDate: job.issueDate || new Date(),
            expiresAt: job.expiresAt,
            req: { protocol: "http", get: () => "localhost" },
          });
          recentCreated.push({
            student_id: student.studentId,
            student_name: student.name,
            ...issued.payload,
            verification_url: issued.payload.verification_url,
          });
        } catch (err) {
          recentSkipped.push({
            student_id: student.studentId,
            student_name: student.name,
            reason: err.message,
          });
        }
      }

      job.processedCount += batchIds.length;
      job.createdCount += recentCreated.length;
      job.skippedCount += recentSkipped.length;
      job.recentCreated = recentCreated;
      job.recentSkipped = recentSkipped;
      job.skippedDetails = [...(job.skippedDetails || []), ...recentSkipped].slice(-200);
      job.status = job.processedCount >= job.studentIds.length ? "completed" : "processing";
      if (job.status === "completed") job.completedAt = new Date();
      await job.save();
    }
  } catch (err) {
    job.status = "failed";
    job.errorMessage = err.message;
    job.completedAt = new Date();
    await job.save();
  }
}

export function serializeJob(job) {
  const total = job.studentIds?.length || 0;
  const processed = job.processedCount || 0;
  return {
    job_id: job._id,
    status: job.status,
    total_count: total,
    processed_count: processed,
    created_count: job.createdCount,
    skipped_count: job.skippedCount,
    progress_percent: total ? Math.round((processed / total) * 100) : 100,
    error_message: job.errorMessage,
    created_at: job.createdAt,
    completed_at: job.completedAt,
    recent_created: job.recentCreated || [],
    recent_skipped: job.recentSkipped || [],
    skipped: job.status === "completed" ? job.skippedDetails || [] : [],
  };
}
