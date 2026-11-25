import { openBulkResourceDialog } from "./bulk-resource-dialog.js";

import { loadResourceCatalog } from "../../services/resource-catalog.js";
import { createResourceCard, resourceRouteId } from "./resource-card.js";
import { openResourceDialog } from "./resource-dialog.js";
import { createRepositoryFilters } from "./repository-filters.js";
import { showRepositoryOverview } from "./repository-overview.js";

export async function renderRepositories(container, requestedId = null) {
  const screen = document.createElement("section");
  screen.className = "repositories-screen";

  screen.innerHTML = `
    <header class="repository-heading">
      <h1>Repositories</h1>
      <div class="resource-actions">
        <button class="resource-secondary" type="button" data-add-link
          aria-haspopup="dialog" disabled>+ Save a link</button>
        <button class="resource-primary" type="button" data-add-pdf
          aria-haspopup="dialog" disabled>+ Upload PDF</button>
      </div>
    </header>

    <dl class="repository-stats" data-repository-stats
      aria-label="Repository overview" hidden></dl>

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

    <p class="resource-results" data-feedback role="status"></p>

    <div class="repository-workspace">
      <section class="repository-library" aria-labelledby="resource-table-heading">
        <div class="repository-heading">
          <h2 id="resource-table-heading">Files &amp; links</h2>
          <p class="resource-results" data-results role="status">Loading resources…</p>
        </div>

        <table class="repository-table" aria-labelledby="resource-table-heading" hidden>
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">File or link</th>
              <th scope="col">Course</th>
              <th scope="col">Added</th>
              <th scope="col">Size or source</th>
              <th scope="col">Open</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>

      <aside class="repository-aside" aria-label="Collection tools" hidden>
        <section class="repository-collection">
          <h2>Your collection</h2>
          <dl>
            <dt>PDF documents</dt><dd data-collection-pdfs></dd>
            <dt>Links</dt><dd data-collection-links></dd>
            <dt>Uploaded PDFs</dt><dd data-collection-uploads></dd>
            <dt>Uploaded size</dt><dd data-collection-size></dd>
          </dl>
        </section>
      </aside>
    </div>
  `;

  const addLink = screen.querySelector("[data-add-link]");
  const addPdf = screen.querySelector("[data-add-pdf]");
  
  const toolbar = screen.querySelector(".resource-toolbar");
  const search = toolbar.querySelector("input");
  const sort = toolbar.querySelector("select");
  const filterBar = toolbar.querySelector(".course-filters");
  const status = screen.querySelector("[data-results]");
  const feedback = screen.querySelector("[data-feedback]");
  const table = screen.querySelector("table");
  const rows = table.tBodies[0];

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
  const filters = createRepositoryFilters(filterBar, search, sort, showResources);

  function showResources() {
    const { visible, summary } = filters.apply(resources);
    detailsButtons.clear();

    rows.replaceChildren(...visible.map((resource) => {
      const row = createResourceCard(resource, showDialog);
      const id = resourceRouteId(resource);

      if (id !== null) detailsButtons.set(id, row.details);

      return row.element;
    }));

    table.hidden = visible.length === 0;
    status.textContent = pdfUnavailable
      ? `${summary} Uploaded PDFs couldn’t be loaded.`
      : summary;
  }

  function refreshCollection() {
    showRepositoryOverview(screen, resources, pdfUnavailable);
    showResources();
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
          resources.push(saved);
          filters.revealSaved(saved);
        }

        refreshCollection();
        feedback.textContent = `${isEdit ? "Updated" : "Saved"}: ${saved.title}`;
      },

      onRemoved(removed) {
        const id = resourceRouteId(removed);
        resources = resources.filter((item) => resourceRouteId(item) !== id);
        refreshCollection();
        feedback.textContent = `Removed: ${removed.title}`;
      },
    });
  }

  addLink.addEventListener("click", () => showDialog(addLink));
  addPdf.addEventListener("click", () => showDialog(addPdf, null, "pdf")); const bulkButton=document.createElement("button"); bulkButton.type="button"; bulkButton.className="resource-secondary"; bulkButton.textContent="+ Bulk Add"; bulkButton.setAttribute("aria-haspopup","dialog"); addPdf.after(bulkButton); bulkButton.onclick=()=>openBulkResourceDialog(bulkButton,{allowPdf:!pdfUnavailable,onSaved(saved){resources.push(...saved);filters.revealSaved(saved[saved.length-1]);refreshCollection();feedback.textContent=saved.length+" resources saved.";}});
  

  toolbar.hidden = false;
  screen.querySelector("[data-repository-stats]").hidden = false;
  screen.querySelector(".repository-aside").hidden = false;
  addLink.disabled = false;
  addPdf.disabled = pdfUnavailable;
  
  refreshCollection();

  if (requestedId !== null) {
    const resource = resources.find((item) => resourceRouteId(item) === requestedId);

    if (resource) {
      showDialog(detailsButtons.get(requestedId) ?? addLink, resource);
    } else {
      feedback.textContent = "Resource not found. You can still use the Repositories list.";
    }
  }
}