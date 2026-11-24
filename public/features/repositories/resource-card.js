import { resourceTypeLabel } from "../../services/resource-catalog.js";
import { createResourceOpenLink } from "./resource-dialog.js";
import { createResourceIcon } from "./resource-icon.js";

export function resourceRouteId(resource) {
  if (resource.id == null || String(resource.id).trim() === "") return null;
  return `${resource.source}:${resource.id}`;
}

export function resourceDetailsHref(resource) {
  const id = resourceRouteId(resource);
  return id === null ? null : `#/repositories/${encodeURIComponent(id)}`;
}

export function createResourceCard(resource, onDetails) {
  const card = document.createElement("article");
  card.className = "resource-card";
  card.dataset.resourceType = resource.type;

  const identity = document.createElement("div");
  identity.className = "resource-card-identity";

  const title = document.createElement("h2");
  title.textContent = resource.title;

  identity.append(createResourceIcon(resource), title);

  const metadata = document.createElement("p");
  metadata.className = "resource-meta";

  const type = document.createElement("span");
  type.className = "resource-card-type";
  type.textContent = resourceTypeLabel(resource);
  metadata.append(type);

  if (resource.courseCode) {
    const courseCode = document.createElement("span");
    courseCode.textContent = resource.courseCode;
    metadata.append(courseCode);
  }

  const sourceLabel = {
    uploaded: "Uploaded",
    saved: "Saved link",
  }[resource.source];

  if (sourceLabel) {
    const source = document.createElement("span");
    source.textContent = sourceLabel;
    metadata.append(source);
  }

  const actions = document.createElement("div");
  actions.className = "resource-actions resource-card-actions";

  const details = document.createElement("button");
  details.type = "button";
  details.className = "resource-secondary";
  details.textContent = "Details";
  details.setAttribute("aria-label", `Details: ${resource.title}`);
  details.setAttribute("aria-haspopup", "dialog");
  details.addEventListener("click", () => onDetails(details, resource));

  actions.append(details);

  const open = createResourceOpenLink(resource);
  if (open) actions.append(open);

  card.append(identity, metadata, actions);

  return { element: card, details };
}