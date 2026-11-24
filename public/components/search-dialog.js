import { loadSearchIndex } from "./search-index.js";
import { findSearchMatches } from "./search-matches.js";
import { showSearchResults } from "./search-results.js";

const resultLimit = 12;

export async function openSearch(trigger) {
  if (document.querySelector("dialog[data-workspace-search]:modal")) return;

  const dialog = document.createElement("dialog");
  dialog.className = "header-search-dialog";
  dialog.dataset.workspaceSearch = "";
  dialog.setAttribute("aria-labelledby", "workspace-search-title");

  dialog.innerHTML = `
    <div class="search-dialog-heading">
      <h2 id="workspace-search-title">Search workspace</h2>
      <button type="button" data-close>Close</button>
    </div>

    <label>
      Search courses, tasks, quizzes, and resources
      <input type="search" class="header-search"
        placeholder="Enter a title or course code" autofocus>
    </label>

    <p role="status">Loading searchable items…</p>
    <div data-search-results></div>
  `;

  const input = dialog.querySelector("input");
  const status = dialog.querySelector('[role="status"]');
  const results = dialog.querySelector("[data-search-results]");
  const listeners = new AbortController();
  let restoreFocus = true;

  function closeForNavigation() {
    restoreFocus = false;
    dialog.close();
  }

  function selectResult(hash) {
    restoreFocus = hash === window.location.hash;
    dialog.close();
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

  input.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;

    const first = results.querySelector("a");
    if (!first) return;

    event.preventDefault();
    first.focus();
  });

  results.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const links = Array.from(results.querySelectorAll("a"));
    const index = links.indexOf(event.target);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === "ArrowUp" && index === 0) {
      input.focus();
      return;
    }

    const step = event.key === "ArrowDown" ? 1 : -1;
    links[index + step]?.focus();
  });

  document.body.append(dialog);
  dialog.showModal();

  try {
    const { entries, partial } = await loadSearchIndex();
    if (!dialog.open) return;

    function updateResults() {
      const query = input.value.trim();

      if (!query) {
        results.replaceChildren();
        status.textContent = partial
          ? "Some items couldn’t be loaded. You can search the available items."
          : "";
        return;
      }

      const matches = findSearchMatches(entries, query);
      const visible = matches.slice(0, resultLimit);
      showSearchResults(results, visible, selectResult);

      const summary = matches.length
        ? `Showing ${visible.length} of ${matches.length} matches.`
        : "No matching items.";

      status.textContent = partial
        ? `${summary} Some items couldn’t be loaded.`
        : summary;
    }

    input.addEventListener("input", updateResults);
    updateResults();
  } catch (error) {
    console.error("Could not load workspace search.", error);
    if (dialog.open) status.textContent = "Couldn’t load search. Try opening it again.";
  }
}