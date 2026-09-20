import mongoose from "mongoose";

export const CERTIFICATE_STATUS = ["VALID", "REVOKED", "EXPIRED", "PENDING"];

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    studentId: { type: String, required: true, uppercase: true, index: true },
    certificateFileUrl: { type: String, required: true },
    certificateFileKey: { type: String, default: "" },
    qrCodeUrl: { type: String, default: "" },
    qrCodeKey: { type: String, default: "" },
    verificationToken: { type: String, required: true, unique: true, index: true },
    courseName: { type: String, default: "" },
    issueDate: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: CERTIFICATE_STATUS, default: "VALID", index: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

certificateSchema.methods.resolveStatus = function resolveStatus() {
  if (this.status === "REVOKED") return "REVOKED";
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return "EXPIRED";
  return this.status || "VALID";
};

export const Certificate = mongoose.model("Certificate", certificateSchema);
