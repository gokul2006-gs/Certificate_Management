import sharp from "sharp";

const DEFAULT_FIELD_LAYOUTS = {
  name: { x1: 25, y1: 43, x2: 83, y2: 49 },
  course: { x1: 29, y1: 62, x2: 75, y2: 72 },
  issue_date: { x1: 30, y1: 75, x2: 70, y2: 82 },
};

function escapeXml(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function boxCenter(field, width, height) {
  const x1 = ((field?.x1 ?? 0) / 100) * width;
  const y1 = ((field?.y1 ?? 0) / 100) * height;
  const x2 = ((field?.x2 ?? 100) / 100) * width;
  const y2 = ((field?.y2 ?? 100) / 100) * height;
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
    boxWidth: Math.max(8, x2 - x1),
    boxHeight: Math.max(8, y2 - y1),
  };
}

function resolveTemplateField(fields, canonical, aliases = []) {
  const source = fields && typeof fields === "object" ? fields : {};
  const keys = [canonical, ...aliases];
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return DEFAULT_FIELD_LAYOUTS[canonical];
}

export async function renderCertificateImage(templateBuffer, { name, courseName, issueDate, fields }) {
  const image = sharp(templateBuffer);
  const meta = await image.metadata();
  const width = meta.width || 1200;
  const height = meta.height || 800;

  const nameBox = boxCenter(resolveTemplateField(fields, "name", ["student_name", "studentName"]), width, height);
  const courseBox = boxCenter(resolveTemplateField(fields, "course", ["course_name", "courseName"]), width, height);
  const dateBox = boxCenter(resolveTemplateField(fields, "issue_date", ["date", "issueDate"]), width, height);

  const safeName = String(name || "").trim();
  const safeCourseName = String(courseName || "").trim();
  const safeIssueDate = String(issueDate || "").trim();

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${safeName ? `<text x="${nameBox.x}" y="${nameBox.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.max(22, Math.round(nameBox.boxHeight * 0.72))}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-weight="700" fill="#1e293b">${escapeXml(safeName)}</text>` : ""}
      ${safeCourseName ? `<text x="${courseBox.x}" y="${courseBox.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.max(16, Math.round(courseBox.boxHeight * 0.55))}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-weight="700" fill="#0f172a">${escapeXml(safeCourseName)}</text>` : ""}
      ${safeIssueDate ? `<text x="${dateBox.x}" y="${dateBox.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.max(14, Math.round(dateBox.boxHeight * 0.5))}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-weight="600" fill="#334155">${escapeXml(safeIssueDate)}</text>` : ""}
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export function formatIssueRange(startDate, endDate, fallback) {
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  return fallback || new Date().toISOString().slice(0, 10);
}
