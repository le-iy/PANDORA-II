import { createCsv } from "../services/csv.js";
import { loadStudyReport } from "../services/study-report.js";

const previewLimit = 5;

export function saveExportFile(data, filename, type) {
  const file = new Blob(data, { type });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function createTable({ columns, rows }) {
  const table = document.createElement("table");
  const heading = table.createTHead().insertRow();

  for (const column of columns) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = column;
    heading.append(cell);
  }

  const body = table.createTBody();

  for (const values of rows.slice(0, previewLimit)) {
    const row = body.insertRow();

    for (const value of values) {
      row.insertCell().textContent = value === "" ? "—" : String(value);
    }
  }

  return table;
}

export function wireStudyReport(section) {
  const type = section.querySelector("[data-report-type]");
  const preview = section.querySelector("[data-preview-report]");
  const exportButton = section.querySelector("[data-export-report]");
  const status = section.querySelector("[data-report-status]");
  const tableContainer = section.querySelector("[data-report-table]");

  let report = null;

  function resetPreview() {
    report = null;
    exportButton.disabled = true;
    tableContainer.replaceChildren();
    status.textContent = "";
  }

  type.addEventListener("change", resetPreview);

  preview.addEventListener("click", () => {
    resetPreview();

    try {
      report = loadStudyReport(type.value);

      if (report.rows.length === 0) {
        status.textContent = "No saved records for this report yet.";
        return;
      }

      tableContainer.append(createTable(report));
      status.textContent =
        `Showing ${Math.min(previewLimit, report.rows.length)} of ` +
        `${report.rows.length} records. Export CSV includes the full report.`;

      exportButton.disabled = false;
    } catch (error) {
      console.error("Could not preview study report.", error);
      status.textContent = "Couldn’t preview this report.";
    }
  });

  exportButton.addEventListener("click", () => {
    if (!report) return;

    try {
      // A UTF-8 BOM helps spreadsheet apps recognize non-ASCII text.
      saveExportFile(
        ["\uFEFF", createCsv(report.columns, report.rows)],
        report.filename,
        "text/csv;charset=utf-8",
      );
      status.textContent = `CSV prepared with ${report.rows.length} records.`;
    } catch (error) {
      console.error("Could not export study report.", error);
      status.textContent = "Couldn’t export the CSV. Try again.";
    }
  });
}