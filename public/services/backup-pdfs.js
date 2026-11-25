import { academicFileType } from "./resource-catalog.js";
const maxPdfBytes = 40 * 1024 * 1024;
const maxEncodedLength = Math.ceil(maxPdfBytes / 3) * 4;

export function encodeBackupPdf(record) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const data = String(reader.result);

      resolve({
        id: record.id,
        title: record.title,
        courseCode: record.courseCode,
        filename: record.filename,
        addedAt: record.addedAt,
        base64: data.slice(data.indexOf(",") + 1),
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(record.file);
  });
}

export function validateBackupPdf(record) {
  if (
    typeof record?.id !== "string" || !record.id.trim() ||
    typeof record.title !== "string" || !record.title.trim() ||
    typeof record.courseCode !== "string" ||
    typeof record.filename !== "string" || !record.filename.trim() ||
    typeof record.addedAt !== "string" ||
    typeof record.base64 !== "string" ||
    record.base64.length < 4 ||
    record.base64.length > maxEncodedLength ||
    record.base64.length % 4 !== 0 ||
    /[^A-Za-z0-9+/=]/.test(record.base64) ||
    !/^[^=]+={0,2}$/.test(record.base64)
  ) {
    throw new Error("Invalid file entry.");
  }

  const padding = record.base64.endsWith("==") ? 2
    : record.base64.endsWith("=") ? 1
    : 0;
  const size = record.base64.length / 4 * 3 - padding;

  if (size <= 0 || size > maxPdfBytes || !academicFileType(record.filename) || (academicFileType(record.filename) === "pdf" && !atob(record.base64.slice(0, 8)).startsWith("%PDF-"))) {
    throw new Error("Invalid file content.");
  }

  return record;
}

export function decodeBackupPdf({ base64, id, title, courseCode, filename, addedAt }) {
  const parts = [];
  const chunkSize = 32_768;

  for (let offset = 0; offset < base64.length; offset += chunkSize) {
    const decoded = atob(base64.slice(offset, offset + chunkSize));
    const bytes = new Uint8Array(decoded.length);

    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }

    parts.push(bytes);
  }

  return {
    id,
    title,
    courseCode,
    filename,
    addedAt,
    file: new Blob(parts, { type: academicFileType(filename) === "pdf" ? "application/pdf" : "application/octet-stream" }),
  };
}