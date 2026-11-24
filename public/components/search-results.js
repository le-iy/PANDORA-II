export function showSearchResults(container, entries, onNavigate) {
  if (entries.length === 0) {
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

    const title = document.createElement("strong");
    title.textContent = entry.title;

    const category = document.createElement("span");
    category.className = "search-result-category";
    category.textContent = [entry.category, entry.courseCode]
      .filter(Boolean).join(" · ");

    link.append(title, category);

    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      onNavigate(link.hash);
    });

    row.append(link);
    list.append(row);
  }

  container.replaceChildren(list);
}