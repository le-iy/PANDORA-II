import { themeAsset } from "../services/theme-packs.js";


const icons = {
  courses: "courses.svg",
  tasks: "tasks.svg",
  quizzes: "quizzes-tab.svg",
  repositories: "repositories.svg",
};

export function showSearchResults(container, entries, onNavigate) {
  if (!entries.length) {
    container.replaceChildren();
    return;
  }

  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Search results");

  for (const entry of entries) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    link.className = "search-result-link";
    link.href = entry.href;

    const icon = document.createElement("img");
    const route = entry.href.split("/")[1];
    icon.className = "workspace-search-result-icon";
    icon.src = themeAsset(`icons/navigation/${icons[route] ?? "search.svg"}`);
    icon.width = 20;
    icon.height = 20;
    icon.alt = "";

    const copy = document.createElement("span");
    copy.className = "workspace-search-result-copy";

    const title = document.createElement("strong");
    title.textContent = entry.title;

    const category = document.createElement("span");
    category.className = "search-result-category";
    category.textContent = [entry.category, entry.courseCode]
      .filter(Boolean)
      .join(" · ");

    const arrow = document.createElement("span");
    arrow.className = "workspace-search-result-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    copy.append(title, category);
    link.append(icon, copy, arrow);

    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      onNavigate(link.hash);
    });

    row.append(link);
    list.append(row);
  }

  container.replaceChildren(list);
}