import QRCode from "qrcode";
import { saveFile } from "./storage.js";
import { verificationUrl } from "./tokens.js";

export async function generateQrPng(studentId, token) {
  const target = verificationUrl(studentId, token);
  const buffer = await QRCode.toBuffer(target, {
    type: "png",
    margin: 1,
    width: 512,
    errorCorrectionLevel: "M",
  });
  const stored = await saveFile(buffer, `qrcodes/${studentId}-${Date.now()}.png`, "image/png");
  return { ...stored, verificationUrl: target };
}
