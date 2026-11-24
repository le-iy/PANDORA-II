import {
  decodeBackupPdf,
  encodeBackupPdf,
  validateBackupPdf,
} from "./backup-pdfs.js";

import {
  listStoredPdfIds,
  listStoredPdfs,
  storePdf,
} from "./pdf-storage.js";

const appName = "PANDORA II";
const storagePrefix = "pandora-ii.";

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
    for (const record of await listStoredPdfs()) {
      pdfs.push(await encodeBackupPdf(record));
    }
  }

  return {
    app: appName,
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
    pdfs,
  };
}

export function parseStudyBackup(text) {
  const backup = JSON.parse(text);

  if (
    backup?.app !== appName ||
    ![1, 2].includes(backup.version) ||
    !backup.entries ||
    typeof backup.entries !== "object" ||
    Array.isArray(backup.entries)
  ) {
    throw new Error("Invalid backup format.");
  }

  const entries = Object.entries(backup.entries);

  if (!entries.every(([key, value]) =>
    key.startsWith(storagePrefix) &&
    key.length > storagePrefix.length &&
    typeof value === "string",
  )) {
    throw new Error("Invalid browser data entry.");
  }

  if (backup.version === 2 && !Array.isArray(backup.pdfs)) {
    throw new Error("Invalid backup PDF list.");
  }

  const pdfs = backup.version === 1 ? [] : backup.pdfs.map(validateBackupPdf);

  if (new Set(pdfs.map(({ id }) => id)).size !== pdfs.length) {
    throw new Error("Duplicate PDF IDs in backup.");
  }

  return { entries, pdfs };
}

export async function planStudyRestore(backup) {
  const entries = backup.entries.filter(([key]) => localStorage.getItem(key) === null);

  const existingIds = backup.pdfs.length
    ? new Set(await listStoredPdfIds())
    : new Set();

  const pdfs = backup.pdfs.filter(({ id }) => !existingIds.has(id));

  return {
    entries,
    pdfs,
    skippedEntries: backup.entries.length - entries.length,
    skippedPdfs: backup.pdfs.length - pdfs.length,
  };
}

export async function restoreStudyBackup(plan, progress) {
  for (const [key, value] of plan.entries) {
    if (localStorage.getItem(key) !== null) {
      progress.skippedEntries += 1;
      continue;
    }

    localStorage.setItem(key, value);
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
}