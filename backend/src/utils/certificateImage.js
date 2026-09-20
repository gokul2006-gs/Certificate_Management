import sharp from "sharp";

function escapeXml(value) {
  return String(value || "")
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

export async function renderCertificateImage(templateBuffer, { name, courseName, issueDate, fields }) {
  const image = sharp(templateBuffer);
  const meta = await image.metadata();
  const width = meta.width || 1200;
  const height = meta.height || 800;
  const nameBox = boxCenter(fields?.name, width, height);
  const courseBox = boxCenter(fields?.course, width, height);
  const dateBox = boxCenter(fields?.issue_date, width, height);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${nameBox.x}" y="${nameBox.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.max(22, Math.round(nameBox.boxHeight * 0.72))}" font-family="Georgia, serif" fill="#1e293b">${escapeXml(name)}</text>
      <text x="${courseBox.x}" y="${courseBox.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.max(16, Math.round(courseBox.boxHeight * 0.55))}" font-family="Georgia, serif" fill="#0f172a">${escapeXml(courseName)}</text>
      <text x="${dateBox.x}" y="${dateBox.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.max(14, Math.round(dateBox.boxHeight * 0.5))}" font-family="Georgia, serif" fill="#334155">${escapeXml(issueDate)}</text>
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
