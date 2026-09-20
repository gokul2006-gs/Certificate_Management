import mongoose from "mongoose";

const certificateViewSchema = new mongoose.Schema(
  {
    certificate: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    viewedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: false }
);

certificateViewSchema.index({ certificate: 1, student: 1 }, { unique: true });

export const CertificateView = mongoose.model("CertificateView", certificateViewSchema);
