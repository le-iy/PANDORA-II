import { applySavedSettings } from "./features/settings/settings.js";
import { saveExportFile, wireStudyReport } from "./components/study-report-export.js";
import {
  createStudyBackup,
  parseStudyBackup,
  planStudyRestore,
  restoreStudyBackup,
} from "./services/study-backup.js";

applySavedSettings();
wireStudyReport(document.querySelector("[data-study-report]"));

const exportButton = document.querySelector("#export-backup");
const includePdfs = document.querySelector("#include-pdfs");
const restoreForm = document.querySelector("#restore-form");
const backupFile = document.querySelector("#backup-file");
const reviewButton = document.querySelector("#review-backup");
const dialog = document.querySelector("#restore-dialog");
const cancel = document.querySelector("#cancel-restore");
const confirm = document.querySelector("#confirm-restore");
const summary = document.querySelector("#restore-summary");
const status = document.querySelector("#backup-status");
const restoreStatus = document.querySelector("#restore-status");

let pendingPlan = null;
let restoring = false;

function amount(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  includePdfs.disabled = true;
  status.textContent = "Preparing backup…";

  try {
    const backup = await createStudyBackup(includePdfs.checked);
    const entryCount = Object.keys(backup.entries).length;

    if (!entryCount && !backup.pdfs.length) {
      status.textContent = "No saved data to export yet.";
      return;
    }

    const timestamp = backup.exportedAt.replaceAll(":", "-");

    saveExportFile(
      [JSON.stringify(backup)],
      `pandora-ii-backup-${timestamp}.json`,
      "application/json",
    );

    status.textContent =
      `Backup prepared with ${amount(entryCount, "entry", "entries")} ` +
      `and ${amount(backup.pdfs.length, "PDF")}.`;
  } catch (error) {
    console.error("Could not export backup.", error);
    status.textContent = includePdfs.checked
      ? "Couldn’t export the backup. Clear Include uploaded PDFs to export browser data only."
      : "Couldn’t export the backup. Try again.";
  } finally {
    exportButton.disabled = false;
    includePdfs.disabled = false;
  }
});

restoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = backupFile.files[0];
  if (!file) return;

  pendingPlan = null;
  backupFile.disabled = true;
  reviewButton.disabled = true;
  status.textContent = "Reading backup…";

  try {
    const backup = parseStudyBackup(await file.text());
    pendingPlan = await planStudyRestore(backup);

    summary.textContent =
      `Restore ${amount(pendingPlan.entries.length, "entry", "entries")} ` +
      `and ${amount(pendingPlan.pdfs.length, "PDF")}. ` +
      `${amount(pendingPlan.skippedEntries, "entry", "entries")} and ` +
      `${amount(pendingPlan.skippedPdfs, "PDF")} already exist in this browser.`;

    confirm.hidden = pendingPlan.entries.length + pendingPlan.pdfs.length === 0;
    cancel.textContent = confirm.hidden ? "Close" : "Cancel";
    restoreStatus.textContent = "";
    status.textContent = "";
    dialog.showModal();
  } catch (error) {
    console.error("Could not review backup.", error);
    status.textContent = "Couldn’t review this PANDORA II backup.";
  } finally {
    backupFile.disabled = false;
    reviewButton.disabled = false;
  }
});

confirm.addEventListener("click", async () => {
  if (!pendingPlan || restoring) return;

  restoring = true;
  cancel.disabled = true;
  confirm.disabled = true;
  restoreStatus.textContent = "Restoring backup…";

  const progress = {
    restoredEntries: 0,
    restoredPdfs: 0,
    skippedEntries: pendingPlan.skippedEntries,
    skippedPdfs: pendingPlan.skippedPdfs,
  };

  try {
    await restoreStudyBackup(pendingPlan, progress);
    applySavedSettings();
    restoreForm.reset();
    dialog.close();

    status.textContent =
      `Restored ${amount(progress.restoredEntries, "entry", "entries")} and ` +
      `${amount(progress.restoredPdfs, "PDF")}. ` +
      `Skipped ${amount(progress.skippedEntries, "existing entry", "existing entries")} ` +
      `and ${amount(progress.skippedPdfs, "existing PDF")}.`;
  } catch (error) {
    console.error("Could not finish restore.", error);
    applySavedSettings();

    restoreStatus.textContent =
      `Restore stopped after ${amount(progress.restoredEntries, "entry", "entries")} ` +
      `and ${amount(progress.restoredPdfs, "PDF")}. ` +
      "You can retry. Entries already restored will be skipped.";
  } finally {
    restoring = false;
    cancel.disabled = false;
    confirm.disabled = false;
  }
});

dialog.addEventListener("cancel", (event) => {
  if (restoring) event.preventDefault();
});

dialog.addEventListener("close", () => {
  pendingPlan = null;
  reviewButton.focus();
});