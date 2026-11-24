export function showHomeRows(list, entries, emptyMessage) {
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "home-empty";
    empty.textContent = emptyMessage;
    list.replaceChildren(empty);
    return;
  }

  const rows = entries.map(({ title, detail, state, href, newTab }) => {
    const row = document.createElement("li");
    row.className = "home-data-row";

    const name = document.createElement(href ? "a" : "strong");
    name.textContent = title;

    if (href) {
      name.href = href;

      if (newTab) {
        name.target = "_blank";
        name.rel = "noopener noreferrer";
        name.setAttribute("aria-label", `${title} (opens in a new tab)`);
      }
    }

    row.append(name);

    if (detail) {
      const description = document.createElement("span");
      description.textContent = detail;

      if (state) description.dataset.state = state;

      row.append(description);
    }

    return row;
  });

  list.replaceChildren(...rows);
}