import { resourceTypeLabel } from "../../services/resource-catalog.js";
import { createResourceOpenLink } from "./resource-dialog.js";

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

  const title = document.createElement("h2");
  title.textContent = resource.title;

  const metadata = document.createElement("p");
  metadata.className = "resource-meta";
  metadata.textContent = [
    resourceTypeLabel(resource),
    resource.courseCode,
    resource.source === "uploaded" ? "Uploaded" : "",
  ].filter(Boolean).join(" · ");

  const actions = document.createElement("div");
  actions.className = "resource-actions";

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

  card.append(title, metadata, actions);

  return { element: card, details };
}