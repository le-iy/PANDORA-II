import {
  resolveResourceUrl,
  resourceTypeLabel,
} from "../../services/resource-catalog.js";
import { createResourceOpenLink } from "./resource-dialog.js";
import { createResourceIcon } from "./resource-icon.js";
import { formatResourceSize } from "./repository-overview.js";

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

export function resourceRouteId(resource) {
  if (resource.id == null || String(resource.id).trim() === "") return null;
  return `${resource.source}:${resource.id}`;
}

export function resourceDetailsHref(resource) {
  const id = resourceRouteId(resource);
  return id === null ? null : `#/repositories/${encodeURIComponent(id)}`;
}

function resourceDate(value) {
  if (!value) return "—";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function sizeOrSource(resource) {
  if (resource.type === "link") {
    return resolveResourceUrl(resource.url)?.hostname || "—";
  }

  if (Number.isFinite(resource.sizeBytes)) {
    return formatResourceSize(resource.sizeBytes);
  }

  return resource.source === "bundled" ? "Project file" : "—";
}

function addCell(row, label, className = "", isHeading = false) {
  const cell = document.createElement(isHeading ? "th" : "td");
  cell.dataset.label = label;
  cell.className = className;

  if (isHeading) cell.scope = "row";

  row.append(cell);
  return cell;
}

export function createResourceCard(resource, onDetails) {
  const row = document.createElement("tr");

  const type = addCell(row, "Type", "resource-row-type");
  const typeLabel = document.createElement("span");
  typeLabel.textContent = resourceTypeLabel(resource);
  type.append(createResourceIcon(resource), typeLabel);

  const name = addCell(row, "File or link", "resource-row-title", true);

  const details = document.createElement("button");
  details.type = "button";
  details.className = "resource-title-button";
  details.textContent = resource.title;
  details.setAttribute("aria-haspopup", "dialog");
  details.addEventListener("click", () => onDetails(details, resource));
  name.append(details);

  if (resource.source === "uploaded") {
    const badge = document.createElement("span");
    badge.className = "resource-source-badge";
    badge.textContent = "Uploaded";
    name.append(badge);
  }

  addCell(row, "Course").textContent = resource.courseCode || "—";
  addCell(row, "Added").textContent = resourceDate(resource.addedAt);
  addCell(row, "Size or source").textContent = sizeOrSource(resource);

  const actions = addCell(row, "Open");
  const open = createResourceOpenLink(resource);

  if (open) actions.append(open);
  else actions.textContent = "Unavailable";

  return { element: row, details };
}