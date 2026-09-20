import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    templateFileUrl: { type: String, required: true },
    templateFileKey: { type: String, default: "" },
    studentIds: { type: [String], default: [] },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    courseName: { type: String, default: "" },
    issueDate: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    expiresAt: { type: Date, default: null },
    processedCount: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    skippedDetails: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recentCreated: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recentSkipped: { type: [mongoose.Schema.Types.Mixed], default: [] },
    errorMessage: { type: String, default: "" },
    cancelRequested: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

jobSchema.virtual("totalCount").get(function totalCount() {
  return this.studentIds.length;
});

jobSchema.virtual("progressPercent").get(function progressPercent() {
  if (!this.studentIds.length) return 100;
  return Math.round((this.processedCount / this.studentIds.length) * 100);
});

export const CertificateGenerationJob = mongoose.model("CertificateGenerationJob", jobSchema);
