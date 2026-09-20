import mongoose from "mongoose";

const loginLogSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    loginAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: false }
);

loginLogSchema.index({ loginAt: -1 });

export const AdminLoginLog = mongoose.model("AdminLoginLog", loginLogSchema);
