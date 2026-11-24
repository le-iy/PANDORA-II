import { loadSearchIndex } from "./search-index.js";
import { findSearchMatches } from "./search-matches.js";
import { showSearchResults } from "./search-results.js";

const resultLimit = 12;
const stylesUrl = new URL("../styles/workspace-popups.css", import.meta.url);

const categories = [
  ["all", "All"],
  ["courses", "Courses"],
  ["tasks", "Tasks"],
  ["quizzes", "Quizzes"],
  ["repositories", "Resources"],
];

// Load alongside the header so Profile gets its styles even before Search opens.
if (!document.head.querySelector("[data-workspace-popup-styles]")) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = stylesUrl.href;
  stylesheet.dataset.workspacePopupStyles = "";
  document.head.append(stylesheet);
}

export async function openSearch(trigger) {
  if (document.querySelector("dialog[data-workspace-search]:modal")) return;

  const dialog = document.createElement("dialog");
  dialog.className = "header-search-dialog workspace-search-popup";
  dialog.dataset.workspaceSearch = "";
  dialog.setAttribute("aria-labelledby", "workspace-search-title");

  dialog.innerHTML = `
    <header class="search-dialog-heading">
      <h2 id="workspace-search-title">Search workspace</h2>
      <button type="button" data-close>Close</button>
    </header>

    <label>
      Search by title or course code
      <input type="search" class="header-search" autofocus>
    </label>

    <div class="workspace-search-filters" role="group"
      aria-label="Search category" data-search-filters></div>

    <p class="workspace-search-status" role="status">Loading searchable items…</p>
    <div data-search-results></div>
  `;

  const input = dialog.querySelector("input");
  const status = dialog.querySelector('[role="status"]');
  const results = dialog.querySelector("[data-search-results]");
  const filters = dialog.querySelector("[data-search-filters]");
  const listeners = new AbortController();

  let activeCategory = "all";
  let index = null;
  let restoreFocus = true;

  function closeForNavigation() {
    restoreFocus = false;
    if (dialog.open) dialog.close();
  }

  function selectResult(hash) {
    restoreFocus = hash === window.location.hash;
    dialog.close();
  }

  function updateResults() {
    if (!index) return;

    const query = input.value.trim();
    const label = categories.find(([id]) => id === activeCategory)[1];
    const partial = index.partial ? " Some items couldn’t be loaded." : "";

    if (!query) {
      results.replaceChildren();
      status.textContent = `Enter a title or course code to search.${partial}`;
      return;
    }

    const entries = activeCategory === "all"
      ? index.entries
      : index.entries.filter(({ href }) => href.split("/")[1] === activeCategory);

    const matches = findSearchMatches(entries, query);
    const visible = matches.slice(0, resultLimit);
    showSearchResults(results, visible, selectResult);

    if (matches.length) {
      const count = matches.length;
      const summary = count > resultLimit
        ? `Showing ${visible.length} of ${count} results.`
        : `${count} ${count === 1 ? "result" : "results"} found.`;

      status.textContent = summary + partial;
      return;
    }

    const summary = activeCategory === "all"
      ? "No matching items. Try a different title or course code."
      : `No matches in ${label}. Select All to search across categories.`;

    status.textContent = summary + partial;
  }

  for (const [id, label] of categories) {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = label;
    control.setAttribute("aria-pressed", String(id === activeCategory));

    control.addEventListener("click", () => {
      activeCategory = id;

      for (const button of filters.querySelectorAll("button")) {
        button.setAttribute("aria-pressed", String(button === control));
      }

      updateResults();
    });

    filters.append(control);
  }

  dialog.querySelector("[data-close]").addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    listeners.abort();
    dialog.remove();
    if (restoreFocus && trigger.isConnected) trigger.focus();
  }, { once: true });

  window.addEventListener("hashchange", closeForNavigation, {
    signal: listeners.signal,
  });

  input.addEventListener("input", updateResults);

  input.addEventListener("keydown", (event) => {
    if (event.isComposing || !["ArrowDown", "Enter"].includes(event.key)) return;

    const first = results.querySelector("a");
    if (!first) return;

    event.preventDefault();

    if (event.key === "Enter") first.click();
    else first.focus();
  });

  results.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;

    const links = [...results.querySelectorAll("a")];
    const position = links.indexOf(event.target);
    if (position === -1) return;

    event.preventDefault();

    if (event.key === "ArrowUp" && position === 0) {
      input.focus();
      return;
    }

    const step = event.key === "ArrowDown" ? 1 : -1;
    links[position + step]?.focus();
  });

  document.body.append(dialog);
  dialog.showModal();

  try {
    index = await loadSearchIndex();
    if (dialog.open) updateResults();
  } catch (error) {
    console.error("Could not load workspace search.", error);
    if (dialog.open) status.textContent = "Couldn’t load search. Try opening it again.";
  }
}