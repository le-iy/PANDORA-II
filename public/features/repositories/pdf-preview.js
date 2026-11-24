import { resolveResourceUrl } from "../../services/resource-catalog.js";

export function createPdfDownload(resource) {
  const url = resolveResourceUrl(resource.url);

  if (
    resource.type !== "pdf" ||
    !url ||
    (resource.source !== "uploaded" && url.origin !== window.location.origin)
  ) {
    return null;
  }

  const link = document.createElement("a");
  link.className = "resource-secondary";
  link.href = url.href;
  link.download = resource.filename || "";
  link.textContent = "Download PDF";
  return link;
}

export function createPdfPreview(resource) {
  const url = resolveResourceUrl(resource.url);

  if (
    resource.type !== "pdf" ||
    !url ||
    (resource.source !== "uploaded" && url.origin !== window.location.origin)
  ) {
    return null;
  }

  const frame = document.createElement("iframe");
  frame.className = "resource-pdf-preview";
  frame.title = `PDF preview: ${resource.title}`;
  frame.src = url.href;
  return frame;
}