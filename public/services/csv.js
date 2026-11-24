function encodeCell(value) {
  let text = String(value ?? "");

  // Keep user-entered text from being interpreted as a spreadsheet formula.
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function createCsv(columns, rows) {
  const lines = [columns, ...rows].map((row) => row.map(encodeCell).join(","));
  return `${lines.join("\r\n")}\r\n`;
}