import {
  removeSavedResource,
  resolveResourceUrl,
  resourceTypeLabel,
  saveResourceLink,
  saveResourcePdf,
} from "../../services/resource-catalog.js";

import { createPdfDownload, createPdfPreview } from "./pdf-preview.js";

export function createResourceOpenLink(resource) {
  const url = resolveResourceUrl(resource.url);
  if (!url) return null;

  const link = document.createElement("a");
  link.className = "resource-primary";
  link.href = url.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = resource.type === "pdf" ? "Open PDF" : "Open link";
  link.setAttribute(
    "aria-label",
    `${link.textContent}: ${resource.title} (opens in a new tab)`,
  );

  return link;
}

function createButton(label, action, variant = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `resource-${variant}`;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function createActions(...items) {
  const actions = document.createElement("div");
  actions.className = "resource-actions";
  actions.append(...items.filter(Boolean));
  return actions;
}

export function openResourceDialog(screen, trigger, {
  resource = null,
  mode = "link",
  catalog,
  onSaved,
  onRemoved,
  fallbackFocus,
}) {
  const dialog = document.createElement("dialog");
  dialog.className = "resource-dialog";
  dialog.setAttribute("aria-labelledby", "resource-dialog-heading");

  const heading = document.createElement("h2");
  heading.id = "resource-dialog-heading";

  const body = document.createElement("div");
  body.className = "resource-dialog-body";
  dialog.append(heading, body);

  let busy = false;

  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });

  function showDetails() {
    dialog.classList.remove("resource-dialog-wide");
    heading.textContent = resource.title;

    const metadata = document.createElement("p");
    metadata.textContent = [
      resourceTypeLabel(resource),
      resource.courseCode,
      resource.source === "uploaded" ? "Uploaded PDF" : "",
    ].filter(Boolean).join(" · ");

    const destination = document.createElement("p");
    destination.className = "resource-destination";
    destination.textContent = resource.filename || resource.url || "Resource URL unavailable.";

    const close = createButton("Close", () => dialog.close());
    const actions = createActions(
      close,
      createResourceOpenLink(resource),
      createPdfDownload(resource),
    );
    const preview = createPdfPreview(resource);

    if (preview) {
      const previewButton = createButton("Preview PDF", () => {
        heading.textContent = `Preview: ${resource.title}`;
        dialog.classList.add("resource-dialog-wide");

        const back = createButton("Back to details", () => {
          showDetails().focus();
        });

        body.replaceChildren(
          createActions(back, createResourceOpenLink(resource), createPdfDownload(resource)),
          preview,
        );
        back.focus();
      });

      actions.append(previewButton);
    }

    if (resource.source === "saved" && resource.type === "link") {
      actions.append(createButton("Edit link", () => showEditor().focus()));
    }

    if (resource.source === "saved" || resource.source === "uploaded") {
      actions.append(createButton("Remove", showRemoveConfirmation, "danger"));
    }

    body.replaceChildren(metadata, destination, actions);
    return close;
  }

  function showEditor() {
    const isPdf = mode === "pdf" && !resource;
    heading.textContent = isPdf ? "Upload PDF" : resource ? "Edit link" : "Save a link";

    const form = document.createElement("form");
    const sourceField = isPdf
      ? `<label>PDF file
           <input name="file" type="file" accept=".pdf,application/pdf" required>
         </label>
         <p class="resource-results">PDF files up to 40 MB.</p>`
      : `<label>URL
           <input name="url" type="url" maxlength="2048" placeholder="https://" required>
         </label>`;

    form.innerHTML = `
      ${sourceField}

      <label>
        ${isPdf ? "Title (optional)" : "Title"}
        <input name="title" maxlength="120" ${isPdf ? "" : "required"}>
      </label>

      <label>
        Course code (optional)
        <input name="courseCode" maxlength="12">
      </label>

      <p class="resource-feedback" role="status"></p>

      <div class="resource-actions">
        <button class="resource-secondary" type="button" data-cancel>Cancel</button>
        <button class="resource-primary" type="submit">
          ${isPdf ? "Save PDF" : "Save link"}
        </button>
      </div>
    `;

    const title = form.elements.namedItem("title");
    const source = form.elements.namedItem(isPdf ? "file" : "url");
    const courseCode = form.elements.namedItem("courseCode");
    const status = form.querySelector('[role="status"]');
    const cancel = form.querySelector("[data-cancel]");
    const save = form.querySelector('[type="submit"]');

    title.value = resource?.title ?? "";
    courseCode.value = resource?.courseCode ?? "";
    if (!isPdf && resource) source.value = resource.url;

    cancel.addEventListener("click", () => {
      if (resource) showDetails().focus();
      else dialog.close();
    });

    form.addEventListener("input", () => {
      if (!busy) status.textContent = "";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;

      if (!isPdf && !title.value.trim()) {
        status.textContent = "Enter a title.";
        title.focus();
        return;
      }

      if (!isPdf && !resolveResourceUrl(source.value, { absolute: true })) {
        status.textContent = "Enter an HTTP or HTTPS URL.";
        source.focus();
        return;
      }

      const details = { title: title.value, courseCode: courseCode.value };
      busy = true;
      save.disabled = true;
      cancel.disabled = true;

      let saved;

      try {
        saved = isPdf
          ? await saveResourcePdf({ ...details, file: source.files[0] })
          : saveResourceLink({ ...details, url: source.value }, catalog, resource?.id ?? null);
      } catch (error) {
        console.error("Could not save resource.", error);

        status.textContent = isPdf && error.name === "Error"
          ? error.message
          : "Couldn’t save the resource. Try again.";
        return;
      } finally {
        busy = false;
        save.disabled = false;
        cancel.disabled = false;
      }

      if (!saved) {
        status.textContent = "This link is already saved for this course.";
        source.focus();
        return;
      }

      onSaved(saved, Boolean(resource));
      dialog.close();
    });

    body.replaceChildren(form);
    return isPdf ? source : title;
  }

  function showRemoveConfirmation() {
    heading.textContent = "Remove resource?";

    const message = document.createElement("p");
    message.textContent = `“${resource.title}” will be removed from your resources.`;

    const status = document.createElement("p");
    status.className = "resource-feedback";
    status.setAttribute("role", "status");

    const keep = createButton("Keep resource", () => showDetails().focus());

    const remove = createButton("Remove resource", async () => {
      busy = true;
      keep.disabled = true;
      remove.disabled = true;

      try {
        await removeSavedResource(resource);
      } catch (error) {
        console.error("Could not remove resource.", error);
        status.textContent = "Couldn’t remove the resource. Try again.";
        return;
      } finally {
        busy = false;
        keep.disabled = false;
        remove.disabled = false;
      }

      onRemoved(resource);
      dialog.close();
    }, "danger");

    body.replaceChildren(message, status, createActions(keep, remove));
    keep.focus();
  }

  const focusTarget = resource ? showDetails() : showEditor();

  dialog.addEventListener("close", () => {
    dialog.remove();
    const target = trigger.isConnected ? trigger : fallbackFocus;
    if (target?.isConnected) target.focus();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
  focusTarget.focus();
}