import {
  loadResourceCatalog,
  resourceTypeLabel,
} from "../../services/resource-catalog.js";

import {
  createResourceOpenLink,
  openResourceDialog,
} from "./resource-dialog.js";

const filters = [
  { id: "all", label: "All items", empty: "No resources yet." },
  { id: "pdf", label: "PDFs", empty: "No PDFs yet." },
  { id: "link", label: "Links", empty: "No links yet." },
  { id: "uploaded", label: "Uploaded PDFs", empty: "No uploaded PDFs yet." },
];

function createResourceCard(resource, onDetails) {
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
  return card;
}

export async function renderRepositories(container) {
  const screen = document.createElement("section");
  screen.className = "repositories-screen";

  screen.innerHTML = `
    <div class="repository-heading">
      <h1>Repositories</h1>
      <div class="resource-actions">
        <button class="resource-secondary" type="button" data-add-link
          aria-haspopup="dialog" disabled>+ Save a link</button>
        <button class="resource-primary" type="button" data-add-pdf
          aria-haspopup="dialog" disabled>+ Upload PDF</button>
      </div>
    </div>

    <div class="resource-toolbar" hidden>
      <label>
        Search resources
        <input type="search" placeholder="Search by title or course code">
      </label>

      <label>
        Sort by
        <select>
          <option value="recent">Recently added</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>

      <div class="course-filters" role="group"
        aria-label="Filter resources by type"></div>
    </div>

    <p class="resource-results" data-results role="status">Loading resources…</p>
    <p class="resource-results" data-feedback role="status"></p>
    <section class="resources-list" aria-label="Study resources"></section>
  `;

  const addLink = screen.querySelector("[data-add-link]");
  const addPdf = screen.querySelector("[data-add-pdf]");
  const toolbar = screen.querySelector(".resource-toolbar");
  const search = toolbar.querySelector("input");
  const sort = toolbar.querySelector("select");
  const filterBar = toolbar.querySelector(".course-filters");
  const status = screen.querySelector("[data-results]");
  const feedback = screen.querySelector("[data-feedback]");
  const list = screen.querySelector(".resources-list");

  container.replaceChildren(screen);

  let resources;
  let pdfUnavailable = false;

  try {
    resources = await loadResourceCatalog({
      onPdfError() {
        pdfUnavailable = true;
      },
    });
  } catch (error) {
    console.error("Could not load resources.", error);

    if (screen.parentElement === container) {
      status.textContent = "Couldn’t load resources. Try refreshing the page.";
    }

    return;
  }

  if (screen.parentElement !== container) return;

  let active = filters[0];
  const buttons = new Map();

  function resourcesFor(filter) {
    if (filter.id === "all") return resources;

    return resources.filter((resource) => filter.id === "uploaded"
      ? resource.source === "uploaded"
      : resource.type === filter.id);
  }

  function showResources() {
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const visible = resourcesFor(active).filter((resource) => {
      const text = [resource.title, resource.courseCode, resource.filename]
        .filter(Boolean).join(" ").toLowerCase();

      return terms.every((term) => text.includes(term));
    });

    if (sort.value === "name") {
      visible.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    } else {
      visible.sort((a, b) =>
        (Date.parse(b.addedAt) || 0) - (Date.parse(a.addedAt) || 0),
      );
    }

    for (const filter of filters) {
      const button = buttons.get(filter.id);
      button.textContent = `${filter.label} (${resourcesFor(filter).length})`;
      button.setAttribute("aria-pressed", String(filter.id === active.id));
    }

    list.replaceChildren(...visible.map((resource) =>
      createResourceCard(resource, (trigger, selected) => showDialog(trigger, selected)),
    ));

    const count = visible.length;

    if (count) {
      status.textContent = `${count} ${count === 1 ? "resource" : "resources"} shown`;
    } else {
      status.textContent = terms.length
        ? "No resources match your search in this filter."
        : active.empty;
    }

    if (pdfUnavailable) status.textContent += " Uploaded PDFs couldn’t be loaded.";
  }

  function showDialog(trigger, resource = null, mode = "link") {
    openResourceDialog(screen, trigger, {
      resource,
      mode,
      catalog: resources,
      fallbackFocus: addLink,

      onSaved(saved, isEdit) {
        if (isEdit) {
          resources = resources.map((item) =>
            item.source === saved.source && item.id === saved.id ? saved : item,
          );
        } else {
          resources = [...resources, saved];
          const nextFilter = saved.source === "uploaded" ? "uploaded" : "link";
          active = filters.find(({ id }) => id === nextFilter);
          search.value = "";
        }

        showResources();
        feedback.textContent = `${isEdit ? "Updated" : "Saved"}: ${saved.title}`;
      },

      onRemoved(removed) {
        resources = resources.filter((item) =>
          item.source !== removed.source || item.id !== removed.id,
        );

        showResources();
        feedback.textContent = `Removed: ${removed.title}`;
      },
    });
  }

  for (const filter of filters) {
    const button = document.createElement("button");
    button.type = "button";

    button.addEventListener("click", () => {
      active = filter;
      feedback.textContent = "";
      showResources();
    });

    buttons.set(filter.id, button);
    filterBar.append(button);
  }

  search.addEventListener("input", showResources);
  sort.addEventListener("change", showResources);
  addLink.addEventListener("click", () => showDialog(addLink));
  addPdf.addEventListener("click", () => showDialog(addPdf, null, "pdf"));

  toolbar.hidden = false;
  addLink.disabled = false;
  addPdf.disabled = pdfUnavailable;
  showResources();
}