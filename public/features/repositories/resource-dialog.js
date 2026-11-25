import { loadCourseCatalog } from "../../services/course-catalog.js";
import {
  removeSavedResource,
  resolveResourceUrl,
  resourceTypeLabel,
  saveResourceLink,
  saveResourcePdf,
} from "../../services/resource-catalog.js";

import { createPdfDownload, createPdfPreview } from "./pdf-preview.js";

const stylesUrl = new URL("../../styles/repository-popups.css", import.meta.url);

function loadPopupStyles() {
  if (document.head.querySelector("[data-repository-popup-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = stylesUrl.href;
  link.dataset.repositoryPopupStyles = "";
  document.head.append(link);
}

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

function createInfo(rows) {
  const info = document.createElement("dl");
  info.className = "resource-popup-info";

  for (const [label, value] of rows) {
    if (!value) continue;

    const row = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");

    term.textContent = label;
    detail.textContent = value;
    row.append(term, detail);
    info.append(row);
  }

  return info;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  const inKilobytes = bytes / 1024;
  return inKilobytes < 1024
    ? `${Math.round(inKilobytes)} KB`
    : `${(inKilobytes / 1024).toFixed(1)} MB`;
}

export function openResourceDialog(screen, trigger, {
  resource = null,
  mode = "link",
  catalog,
  onSaved,
  onRemoved,
  fallbackFocus,
}) {
  loadPopupStyles();

  const dialog = document.createElement("dialog");
  dialog.className = "resource-dialog resource-popup";
  dialog.setAttribute("aria-labelledby", "resource-dialog-heading");

  dialog.innerHTML = `
    <header class="resource-popup-header">
      <p class="resource-popup-kind"></p>
      <h2 id="resource-dialog-heading"></h2>
    </header>
    <div class="resource-dialog-body"></div>
  `;

  const kind = dialog.querySelector(".resource-popup-kind");
  const heading = dialog.querySelector("h2");
  const body = dialog.querySelector(".resource-dialog-body");

  let busy = false;

  function setView(label, title, wide = false) {
    dialog.classList.toggle("resource-dialog-wide", wide);
    kind.textContent = label;
    heading.textContent = title;
  }

  function closeDialog() {
    if (!busy) dialog.close();
  }

  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });

  function showPreview() {
    const preview = createPdfPreview(resource);
    if (!preview) return;

    setView("PDF preview", resource.title, true);

    const back = createButton("Back to details", () => {
      const { close, previewButton } = showDetails();
      (previewButton ?? close).focus();
    });

    const actions = createActions(
      back,
      createPdfDownload(resource),
      createResourceOpenLink(resource),
    );
    actions.classList.add("resource-popup-preview-actions");

    body.replaceChildren(actions, preview);
    back.focus();
  }

  function showDetails() {
    setView(resourceTypeLabel(resource), resource.title);

    const destination = resource.type === "pdf"
      ? resource.filename || (
        resource.source === "uploaded" ? "" : resource.url
      )
      : resource.url;

    const info = createInfo([
      ["Course", resource.courseCode || "No course assigned"],
      [resource.type === "pdf" ? "File" : "URL", destination],
      ["Source", resource.source === "uploaded" ? "Uploaded from this browser" : ""],
    ]);

    const close = createButton("Close", closeDialog);
    const actions = createActions(close);

    const url = resolveResourceUrl(resource.url);
    const canPreview = resource.type === "pdf" && url &&
      (resource.source === "uploaded" || url.origin === window.location.origin);
    const previewButton = canPreview
      ? createButton("Preview PDF", showPreview)
      : null;

    const editButton = resource.source === "saved" && resource.type === "link"
      ? createButton("Edit link", () => showEditor().focus())
      : null;

    const removeButton = ["saved", "uploaded"].includes(resource.source)
      ? createButton("Remove", showRemoveConfirmation, "danger")
      : null;

    actions.append(
      ...[
        editButton,
        removeButton,
        createPdfDownload(resource),
        previewButton,
        createResourceOpenLink(resource),
      ].filter(Boolean),
    );

    body.replaceChildren(info, actions);
    return { close, previewButton, editButton, removeButton };
  }

  function showEditor() {
    const isPdf = mode === "pdf" && !resource;
    setView(
      "Repositories",
      isPdf ? "Upload PDF" : resource ? "Edit link" : "Save a link",
    );

    const form = document.createElement("form");

    const sourceField = isPdf
      ? `
        <div class="resource-popup-file">
          <label>
            PDF file
            <input name="file" type="file" accept=".pdf,application/pdf"
              aria-describedby="resource-file-hint" required>
          </label>
          <p id="resource-file-hint">PDF files up to 40 MB.</p>
          <p data-file-selection aria-live="polite" hidden></p>
        </div>
      `
      : `
        <label>
          URL
          <input name="url" type="url" maxlength="2048" placeholder="https://" required>
        </label>
      `;

    form.innerHTML = `
      ${sourceField}

      <label>
        ${isPdf ? "Title (optional)" : "Title"}
        <input name="title" maxlength="120" ${isPdf ? "" : "required"}>
      </label>

      <label>
        Course (optional)
        <select name="courseCode" aria-describedby="resource-course-status"><option value="">No course</option></select>
      </label>

      <p id="resource-course-status" aria-live="polite"></p>
      <p class="resource-feedback" role="status"></p>

      <div class="resource-actions">
        <button class="resource-secondary" type="button" data-cancel>Cancel</button>
        <button class="resource-primary" type="submit">
          ${isPdf ? "Save PDF" : resource ? "Save changes" : "Save link"}
        </button>
      </div>
    `;

    const title = form.elements.namedItem("title");
    const source = form.elements.namedItem(isPdf ? "file" : "url");
    const courseCode = form.elements.namedItem("courseCode");
    const status = form.querySelector('[role="status"]');
    const cancel = form.querySelector("[data-cancel]");
    const save = form.querySelector('[type="submit"]');
    const saveLabel = save.textContent.trim();

    title.value = resource?.title ?? "";
    const selectedCode = resource?.courseCode ?? "";
    if (selectedCode) courseCode.add(new Option(selectedCode, selectedCode));
    courseCode.value = selectedCode;
    const courseStatus = form.querySelector("#resource-course-status");
    loadCourseCatalog().then(courses => {
      if (!form.isConnected) return;
      for (const { code, name } of courses) {
        if (!code || !name) continue;
        const label = code + " · " + name;
        const existing = [...courseCode.options].find(option => option.value === code);
        if (existing) existing.textContent = label;
        else courseCode.add(new Option(label, code));
      }
      if (!courses.length) courseStatus.textContent = "No courses available yet.";
    }).catch(error => {
      console.error("Could not load repository courses.", error);
      if (form.isConnected) courseStatus.textContent = "Could not load courses. You can still save this resource.";
    });
    if (!isPdf && resource) source.value = resource.url;

    if (isPdf) {
      const selection = form.querySelector("[data-file-selection]");

      source.addEventListener("change", () => {
        const file = source.files[0];
        selection.hidden = !file;
        selection.textContent = file ? `${file.name} · ${formatFileSize(file.size)}` : "";
      });
    }

    cancel.addEventListener("click", () => {
      if (resource) {
        const { close, editButton } = showDetails();
        (editButton ?? close).focus();
      } else {
        closeDialog();
      }
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
      const file = isPdf ? source.files[0] : null;
      const url = isPdf ? null : source.value;

      busy = true;
      form.inert = true;
      save.textContent = isPdf ? "Saving PDF…" : "Saving…";
      status.textContent = "";

      let saved;
      let failure = "";

      try {
        saved = isPdf
          ? await saveResourcePdf({ ...details, file })
          : saveResourceLink({ ...details, url }, catalog, resource?.id ?? null);
      } catch (error) {
        console.error("Could not save resource.", error);
        failure = isPdf && error.name === "Error"
          ? error.message
          : "Couldn’t save the resource. Try again.";
      } finally {
        busy = false;
        form.inert = false;
        save.textContent = saveLabel;
      }

      if (failure) {
        status.textContent = failure;
        save.focus();
        return;
      }

      if (!saved) {
        status.textContent = "This link is already saved for this course.";
        source.focus();
        return;
      }

      onSaved(saved, Boolean(resource));
      closeDialog();
    });

    body.replaceChildren(form);
    return source;
  }

  function showRemoveConfirmation() {
    setView("Repositories", "Remove resource?");

    const message = document.createElement("p");
    message.textContent = `“${resource.title}” will be removed from your resources.`;

    const status = document.createElement("p");
    status.className = "resource-feedback";
    status.setAttribute("role", "status");

    const keep = createButton("Keep resource", () => {
      const { close, removeButton } = showDetails();
      (removeButton ?? close).focus();
    });

    const remove = createButton("Remove resource", async () => {
      if (busy) return;

      busy = true;
      keep.disabled = true;
      remove.disabled = true;
      remove.textContent = "Removing…";
      status.textContent = "";

      let removed = false;

      try {
        await removeSavedResource(resource);
        removed = true;
      } catch (error) {
        console.error("Could not remove resource.", error);
        status.textContent = "Couldn’t remove the resource. Try again.";
      } finally {
        busy = false;
        keep.disabled = false;
        remove.disabled = false;
        remove.textContent = "Remove resource";
      }

      if (removed) {
        onRemoved(resource);
        closeDialog();
      } else {
        remove.focus();
      }
    }, "danger");

    body.replaceChildren(message, status, createActions(keep, remove));
    keep.focus();
  }

  const focusTarget = resource ? showDetails().close : showEditor();

  dialog.addEventListener("close", () => {
    dialog.remove();
    const target = trigger?.isConnected ? trigger : fallbackFocus;
    if (target?.isConnected) target.focus();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
  focusTarget.focus();
}