import { deleteStoredPdf, listStoredPdfs, storePdf } from "./pdf-storage.js";

const publicUrl = new URL("../", import.meta.url);
const resourcesUrl = new URL("data/resources.json", publicUrl);
const storageKey = "pandora-ii.saved-resources";
const pdfUrls = new Map();

export const maxPdfBytes = 40 * 1024 * 1024;

function requireList(items) {
  if (!Array.isArray(items)) throw new Error("Invalid resource list.");
  return items;
}

function readSavedLinks() {
  return requireList(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
}

function writeSavedLinks(links) {
  localStorage.setItem(storageKey, JSON.stringify(links));
}

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function exposePdf(record) {
  let url = pdfUrls.get(record.id);

  if (!url) {
    url = URL.createObjectURL(record.file);
    pdfUrls.set(record.id, url);
  }

  return {
    id: record.id,
    title: record.title,
    courseCode: record.courseCode,
    type: "pdf",
    source: "uploaded",
    url,
    filename: record.filename,
    addedAt: record.addedAt,
  };
}

function releasePdfUrl(id) {
  const url = pdfUrls.get(id);

  if (url) {
    URL.revokeObjectURL(url);
    pdfUrls.delete(id);
  }
}

export function resolveResourceUrl(value, { absolute = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = absolute ? new URL(value) : new URL(value, publicUrl);

    if (url.protocol === "https:" || url.protocol === "http:") return url;

    if (
      !absolute &&
      url.protocol === "blob:" &&
      [...pdfUrls.values()].includes(url.href)
    ) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

export function resourceTypeLabel(resource) {
  return resource.type === "pdf" ? "PDF" : "Link";
}

export async function loadResourceCatalog({ onPdfError } = {}) {
  const response = await fetch(resourcesUrl);

  if (!response.ok) {
    throw new Error(`Could not load resources (${response.status}).`);
  }

  const bundled = requireList(await response.json())
    .filter((item) => typeof item?.title === "string")
    .map((item) => ({ ...item, source: "bundled" }));

  const saved = readSavedLinks()
    .filter((item) => typeof item?.title === "string")
    .map((item) => ({ ...item, source: "saved" }));

  try {
    const pdfs = await listStoredPdfs();
    const ids = new Set(pdfs.map((pdf) => pdf.id));

    for (const id of pdfUrls.keys()) {
      if (!ids.has(id)) releasePdfUrl(id);
    }

    return [...bundled, ...saved, ...pdfs.map(exposePdf)];
  } catch (error) {
    console.error("Could not load uploaded PDFs.", error);
    onPdfError?.();
    return [...bundled, ...saved];
  }
}

export function saveResourceLink(details, catalog, existingId = null) {
  const title = details.title.trim();
  const courseCode = normalizeCode(details.courseCode);
  const url = resolveResourceUrl(details.url.trim(), { absolute: true });

  if (!title || !url) throw new Error("A title and an HTTP or HTTPS URL are required.");

  const saved = readSavedLinks();
  const existing = saved.find((item) => item?.id === existingId);

  if (existingId !== null && (!existing || existing.type !== "link")) {
    throw new Error("Saved link no longer exists.");
  }

  const bundled = catalog.filter((item) => item.source === "bundled");
  const otherSaved = saved.filter((item) => item?.id !== existingId);

  const duplicate = [...bundled, ...otherSaved].some((item) =>
    item?.type === "link" &&
    normalizeCode(item.courseCode) === courseCode &&
    resolveResourceUrl(item.url)?.href === url.href,
  );

  if (duplicate) return null;

  const resource = {
    id: existing?.id ?? crypto.randomUUID(),
    title,
    courseCode,
    type: "link",
    url: url.href,
    addedAt: existing?.addedAt ?? new Date().toISOString(),
  };

  writeSavedLinks(existing
    ? saved.map((item) => item?.id === existingId ? resource : item)
    : [...saved, resource]);

  return { ...resource, source: "saved" };
}

export async function saveResourcePdf({ title, courseCode, file }) {
  if (!(file instanceof File) || file.size === 0 || file.size > maxPdfBytes) {
    throw new Error("Choose a PDF file up to 40 MB.");
  }

  const signature = await file.slice(0, 5).text();

  if (signature !== "%PDF-") throw new Error("Choose a valid PDF file.");

  const record = {
    id: crypto.randomUUID(),
    title: title.trim() || file.name,
    courseCode: normalizeCode(courseCode),
    filename: file.name,
    addedAt: new Date().toISOString(),
    file: file.slice(0, file.size, "application/pdf"),
  };

  await storePdf(record);
  return exposePdf(record);
}

export async function removeSavedResource(resource) {
  if (resource.source === "uploaded") {
    await deleteStoredPdf(resource.id);
    releasePdfUrl(resource.id);
    return;
  }

  if (resource.source !== "saved") {
    throw new Error("This resource is managed in resources.json.");
  }

  const saved = readSavedLinks();

  if (!saved.some((item) => item?.id === resource.id && item.type === "link")) {
    throw new Error("Saved link no longer exists.");
  }

  writeSavedLinks(saved.filter((item) => item?.id !== resource.id));
}