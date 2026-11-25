import { decodeBackupPdf, encodeBackupPdf, validateBackupPdf } from "./backup-pdfs.js";
import { listStoredPdfIds, listStoredPdfs, storePdf } from "./pdf-storage.js";
import { isUploadedWallpaper, listWallpapers, readWallpaper, restoreWallpaper } from "./wallpaper-storage.js";

const appName = "PANDORA II";
const storagePrefix = "pandora-ii.";
const mergeKeys = new Map([
  ["pandora-ii.saved-resources", "id"],
  ["pandora-ii.custom-quizzes", "id"],
  ["pandora-ii.quiz-history", "attemptId"],
]);
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxWallpaperBytes = 10 * 1024 * 1024;

export async function createStudyBackup(includePdfs) {
  const entries = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(storagePrefix)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  const pdfs = [];
  if (includePdfs) {
    for (const record of await listStoredPdfs()) pdfs.push(await encodeBackupPdf(record));
  }
  const wallpapers = [];
  for (const { id } of await listWallpapers()) {
    const record = await readWallpaper(id);
    if (!record) continue;
    const { base64 } = await encodeBackupPdf({ file: record.image });
    wallpapers.push({ id, name: record.name, type: record.image.type, base64 });
  }
  return { app: appName, version: 3, exportedAt: new Date().toISOString(), entries, pdfs, wallpapers };
}

function validateWallpaper(record) {
  const { id, name, type, base64 } = record ?? {};
  if (!isUploadedWallpaper(id) || typeof name !== "string" || !name.trim() ||
      !imageTypes.has(type) || typeof base64 !== "string" || base64.length < 16 ||
      base64.length > Math.ceil(maxWallpaperBytes / 3) * 4 ||
      base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("Invalid wallpaper entry.");
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const header = atob(base64.slice(0, 16));
  const validHeader = type === "image/png" ? header.startsWith("\x89PNG\r\n\x1a\n")
    : type === "image/jpeg" ? header.startsWith("\xff\xd8\xff")
    : header.startsWith("RIFF") && header.slice(8) === "WEBP";
  if (!validHeader || base64.length / 4 * 3 - padding > maxWallpaperBytes) {
    throw new Error("Invalid wallpaper content.");
  }
  return { id, name, type, base64 };
}

export function parseStudyBackup(text) {
  const backup = JSON.parse(text);
  if (backup?.app !== appName || ![1, 2, 3].includes(backup.version) ||
      !backup.entries || typeof backup.entries !== "object" || Array.isArray(backup.entries)) {
    throw new Error("Invalid backup format.");
  }
  const entries = Object.entries(backup.entries);
  if (!entries.every(([key, value]) => key.startsWith(storagePrefix) &&
      key.length > storagePrefix.length && typeof value === "string")) {
    throw new Error("Invalid browser data entry.");
  }
  if (backup.version >= 2 && !Array.isArray(backup.pdfs)) throw new Error("Invalid backup PDF list.");
  if (backup.version === 3 && !Array.isArray(backup.wallpapers)) throw new Error("Invalid wallpaper list.");
  const pdfs = backup.version === 1 ? [] : backup.pdfs.map(validateBackupPdf);
  const wallpapers = backup.version === 3 ? backup.wallpapers.map(validateWallpaper) : [];
  for (const files of [pdfs, wallpapers]) {
    if (new Set(files.map(({ id }) => id)).size !== files.length) throw new Error("Duplicate file IDs in backup.");
  }
  return { entries, pdfs, wallpapers };
}

function planEntry([key, incoming]) {
  const current = localStorage.getItem(key);
  if (current === null) return { value: incoming, merged: false };
  const identity = mergeKeys.get(key);
  if (!identity) return null;
  try {
    const existing = JSON.parse(current);
    const candidates = JSON.parse(incoming);
    if (!Array.isArray(existing) || !Array.isArray(candidates)) return null;
    const seen = new Set(existing.map(item => item?.[identity]));
    const missing = candidates.filter(item => {
      const id = item?.[identity];
      if (typeof id !== "string" || !id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return missing.length ? { value: JSON.stringify([...existing, ...missing]), merged: true } : null;
  } catch {
    return null;
  }
}

export async function planStudyRestore(backup) {
  const selected = backup.entries.map(entry => ({ entry, action: planEntry(entry) })).filter(row => row.action);
  const pdfIds = new Set(backup.pdfs.length ? await listStoredPdfIds() : []);
  const wallpaperIds = new Set(backup.wallpapers.length ? (await listWallpapers()).map(({ id }) => id) : []);
  const pdfs = backup.pdfs.filter(({ id }) => !pdfIds.has(id));
  const wallpapers = backup.wallpapers.filter(({ id }) => !wallpaperIds.has(id));
  return {
    entries: selected.map(row => row.entry),
    mergedEntries: selected.filter(row => row.action.merged).length,
    pdfs, wallpapers,
    skippedEntries: backup.entries.length - selected.length,
    skippedPdfs: backup.pdfs.length - pdfs.length,
    skippedWallpapers: backup.wallpapers.length - wallpapers.length,
  };
}

export async function restoreStudyBackup(plan, progress) {
  for (const entry of plan.entries) {
    const action = planEntry(entry);
    if (!action) { progress.skippedEntries += 1; continue; }
    localStorage.setItem(entry[0], action.value);
    progress.restoredEntries += 1;
  }
  for (const pdf of plan.pdfs) {
    try {
      await storePdf(decodeBackupPdf(pdf));
      progress.restoredPdfs += 1;
    } catch (error) {
      if (error.name !== "ConstraintError") throw error;
      progress.skippedPdfs += 1;
    }
  }
  for (const wallpaper of plan.wallpapers) {
    try {
      const { file } = decodeBackupPdf(wallpaper);
      await restoreWallpaper({ id: wallpaper.id, name: wallpaper.name, image: file.slice(0, file.size, wallpaper.type) });
      progress.restoredWallpapers += 1;
    } catch (error) {
      if (error.name !== "ConstraintError") throw error;
      progress.skippedWallpapers += 1;
    }
  }
}
