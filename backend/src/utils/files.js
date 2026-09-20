import path from "node:path";
import AdmZip from "adm-zip";

const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

export function isAllowedCertificateName(filename) {
  return ALLOWED_EXT.has(path.extname(String(filename || "")).toLowerCase());
}

export function studentIdFromFilename(filename) {
  const base = path.basename(String(filename || ""));
  const match = base.match(/^([A-Za-z0-9]+)(?=[._-])/);
  if (match) return match[1].toUpperCase();
  const withoutExt = base.replace(/\.[^.]+$/, "");
  if (/^[A-Za-z0-9]+$/.test(withoutExt)) return withoutExt.toUpperCase();
  return null;
}

export function safeZipEntries(buffer) {
  const zip = new AdmZip(buffer);
  const files = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, "/");
    if (name.includes("..") || path.isAbsolute(name)) continue;
    if (!isAllowedCertificateName(name)) continue;
    files.push({
      name: path.basename(name),
      buffer: entry.getData(),
    });
  }
  return files;
}
