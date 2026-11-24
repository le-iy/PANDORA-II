import { loadResourceCatalog } from "../../services/resource-catalog.js";
import { createResourceCard, resourceRouteId } from "./resource-card.js";
import { openResourceDialog } from "./resource-dialog.js";
import { createRepositoryFilters } from "./repository-filters.js";

export async function renderRepositories(container, requestedId = null) {
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

  const detailsButtons = new Map();
  const filters = createRepositoryFilters(filterBar, search, sort, () => {
    feedback.textContent = "";
    showResources();
  });

  function showResources() {
    const { visible, summary } = filters.apply(resources);
    detailsButtons.clear();

    const cards = visible.map((resource) => {
      const card = createResourceCard(resource, showDialog);
      const id = resourceRouteId(resource);

      if (id !== null) detailsButtons.set(id, card.details);

      return card.element;
    });

    list.replaceChildren(...cards);
    status.textContent = pdfUnavailable
      ? `${summary} Uploaded PDFs couldn’t be loaded.`
      : summary;
  }

  function showDialog(trigger, resource = null, mode = "link") {
    openResourceDialog(screen, trigger, {
      resource,
      mode,
      catalog: resources,
      fallbackFocus: addLink,

      onSaved(saved, isEdit) {
        if (isEdit) {
          const id = resourceRouteId(saved);
          resources = resources.map((item) =>
            resourceRouteId(item) === id ? saved : item,
          );
        } else {
          resources = [...resources, saved];
          filters.revealSaved(saved);
        }

        showResources();
        feedback.textContent = `${isEdit ? "Updated" : "Saved"}: ${saved.title}`;
      },

      onRemoved(removed) {
        const id = resourceRouteId(removed);
        resources = resources.filter((item) => resourceRouteId(item) !== id);
        showResources();
        feedback.textContent = `Removed: ${removed.title}`;
      },
    });
  }

  addLink.addEventListener("click", () => showDialog(addLink));
  addPdf.addEventListener("click", () => showDialog(addPdf, null, "pdf"));

  toolbar.hidden = false;
  addLink.disabled = false;
  addPdf.disabled = pdfUnavailable;
  showResources();

  if (requestedId !== null) {
    const resource = resources.find((item) => resourceRouteId(item) === requestedId);

    if (resource) {
      showDialog(detailsButtons.get(requestedId) ?? addLink, resource);
    } else {
      feedback.textContent = "Resource not found. You can still use the Repositories list.";
    }
  }
}