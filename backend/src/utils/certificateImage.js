import { readFileSync } from "node:fs";
import sharp from "sharp";
import opentype from "opentype.js";

const DEFAULT_FIELD_LAYOUTS = {
  name: { x1: 25, y1: 43, x2: 83, y2: 49 },
  course: { x1: 29, y1: 62, x2: 75, y2: 72 },
  issue_date: { x1: 30, y1: 75, x2: 70, y2: 82 },
};
const GREAT_VIBES_FONT_BUFFER = readFileSync(
  new URL("../../Great_Vibes/GreatVibes-Regular.ttf", import.meta.url)
);
const GREAT_VIBES_FONT = opentype.parse(
  GREAT_VIBES_FONT_BUFFER.buffer.slice(
    GREAT_VIBES_FONT_BUFFER.byteOffset,
    GREAT_VIBES_FONT_BUFFER.byteOffset + GREAT_VIBES_FONT_BUFFER.byteLength
  )
);

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

function textPath(text, box, width, height, fontSize) {
  const size = Math.max(fontSize, Math.round(box.boxHeight * 0.72));
  const scale = size / GREAT_VIBES_FONT.unitsPerEm;
  const glyphs = Array.from(text, (character) => GREAT_VIBES_FONT.charToGlyph(character));
  const measured = glyphs.reduce((total, glyph) => total + glyph.advanceWidth * scale, 0);
  const x = Math.max(0, Math.min(width - measured, box.x - measured / 2));
  const baseline = Math.max(size, Math.min(height, box.y + size * 0.35));
  let cursor = x;
  return glyphs.map((glyph) => {
    const path = glyph.getPath(cursor, baseline, size).toPathData(2);
    cursor += glyph.advanceWidth * scale;
    return path;
  }).join(" ");
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
  const namePath = safeName ? textPath(safeName, nameBox, width, height, 22) : "";
  const coursePath = safeCourseName ? textPath(safeCourseName, courseBox, width, height, 16) : "";
  const datePath = safeIssueDate ? textPath(safeIssueDate, dateBox, width, height, 14) : "";

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${namePath ? `<path d="${namePath}" fill="#1e293b"/>` : ""}
      ${coursePath ? `<path d="${coursePath}" fill="#0f172a"/>` : ""}
      ${datePath ? `<path d="${datePath}" fill="#334155"/>` : ""}
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
