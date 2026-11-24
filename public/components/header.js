import { openProfile } from "./profile.js";
import { getExperience } from "../services/experience.js";
import { loadCourseCatalog } from "../services/course-catalog.js";
import {
  loadResourceCatalog,
  resourceTypeLabel,
} from "../services/resource-catalog.js";

const headerListeners = new WeakMap();

function createIcon(path, className) {
  const icon = document.createElement("img");
  icon.className = className;
  icon.src = new URL(`../assets/icons/${path}`, import.meta.url).href;
  icon.alt = "";
  icon.addEventListener("error", () => icon.remove(), { once: true });
  return icon;
}

function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");
  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");
  return tasks;
}

function createResultList(results, onSelect) {
  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Search results");

  for (const result of results) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "search-result-link";
    link.href = result.href;

    const title = document.createElement("strong");
    title.textContent = result.title;

    const category = document.createElement("span");
    category.className = "search-result-category";
    category.textContent = result.category;

    link.append(title, category);

    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      onSelect(link.hash);
    });

    item.append(link);
    list.append(item);
  }

  return list;
}

async function openSearch(trigger) {
  const dialog = document.createElement("dialog");
  dialog.className = "header-search-dialog";
  dialog.setAttribute("aria-labelledby", "workspace-search-title");

  dialog.innerHTML = `
    <div class="search-dialog-heading">
      <h2 id="workspace-search-title">Search workspace</h2>
      <button type="button" data-close>Close</button>
    </div>

    <label>
      Search courses, tasks, and files
      <input type="search" class="header-search"
        placeholder="Enter a title or course code" autofocus>
    </label>

    <p role="status">Loading searchable items…</p>
    <div data-search-results></div>
  `;

  const input = dialog.querySelector("input");
  const status = dialog.querySelector('[role="status"]');
  const resultsContainer = dialog.querySelector("[data-search-results]");
  let restoreFocus = true;

  dialog.querySelector("[data-close]").addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (restoreFocus && trigger.isConnected) trigger.focus();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();

  const [courses, tasks, resources] = await Promise.allSettled([
    loadCourseCatalog(),
    Promise.resolve().then(loadTasks),
    loadResourceCatalog(),
  ]);

  if (!dialog.open) return;

  const entries = [
    ...(courses.value ?? []).map((course) => ({
      title: course.name,
      category: `Course · ${course.code}`,
      href: `#/courses/${encodeURIComponent(course.code)}`,
    })),
    ...(tasks.value ?? []).filter(Boolean).map((task) => {
      const label = task.completed
        ? "Completed task"
        : task.status === "in-progress" ? "In-progress task" : "Open task";

      return {
        title: task.title,
        category: [label, task.courseCode].filter(Boolean).join(" · "),
        href: "#/tasks",
      };
    }),
    ...(resources.value ?? []).map((resource) => ({
      title: resource.title,
      category: [resourceTypeLabel(resource), resource.courseCode]
        .filter(Boolean).join(" · "),
      href: "#/repositories",
    })),
  ].filter((entry) => typeof entry.title === "string" && entry.title.trim());

  const partial = [courses, tasks, resources].some(
    (source) => source.status === "rejected",
  );

  function selectResult(hash) {
    restoreFocus = hash === window.location.hash;
    dialog.close();
  }

  function showMatches() {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      resultsContainer.replaceChildren();
      status.textContent = partial
        ? "Some items couldn’t be loaded. You can still search available items."
        : "";
      return;
    }

    const terms = query.split(/\s+/);
    const matches = entries.filter(({ title, category }) => {
      const searchText = `${title} ${category}`.toLowerCase();
      return terms.every((term) => searchText.includes(term));
    });

    if (matches.length === 0) {
      resultsContainer.replaceChildren();
      status.textContent = partial
        ? "No matches among the available items. Some items couldn’t be loaded."
        : "No matching items.";
      return;
    }

    const visible = matches.slice(0, 12);
    resultsContainer.replaceChildren(createResultList(visible, selectResult));
    status.textContent =
      `Showing ${visible.length} of ${matches.length} matches.` +
      (partial ? " Some items couldn’t be loaded." : "");
  }

  input.addEventListener("input", showMatches);
  showMatches();
}

export function renderHeader(container) {
  headerListeners.get(container)?.abort();
  const listener = new AbortController();
  headerListeners.set(container, listener);

  const search = document.createElement("button");
  search.type = "button";
  search.className = "header-search workspace-search-trigger";
  search.setAttribute("aria-haspopup", "dialog");

  const searchLabel = document.createElement("span");
  searchLabel.textContent = "Search courses, tasks, and files…";
  search.append(createIcon("navigation/search.svg", "header-search-icon"), searchLabel);
  search.addEventListener("click", () => openSearch(search));

  const profile = document.createElement("button");
  profile.type = "button";
  profile.className = "header-profile workspace-profile-trigger";
  profile.setAttribute("aria-label", "Open scholar profile");
  profile.setAttribute("aria-haspopup", "dialog");

  const levelBadge = document.createElement("span");
  levelBadge.className = "header-level";
  levelBadge.textContent = "Profile";
  profile.append(
    createIcon("gamification/scholar-badge.svg", "header-scholar-icon"),
    levelBadge,
  );

  let latestRequest = 0;

  async function refreshLevel() {
    const request = ++latestRequest;

    try {
      const { level } = await getExperience();
      if (request !== latestRequest || listener.signal.aborted) return;

      levelBadge.textContent = `LVL ${String(level).padStart(2, "0")}`;
      profile.setAttribute("aria-label", `Open scholar profile, level ${level}`);
    } catch (error) {
      console.error("Could not load your level.", error);
    }
  }

  profile.addEventListener("click", () => {
    refreshLevel();
    openProfile(profile);
  });

  container.replaceChildren(search, profile);
  window.addEventListener("hashchange", refreshLevel, { signal: listener.signal });
  refreshLevel();
}