export function createWorkspaceRow(row) {
  const item = document.createElement("li");
  const name = document.createElement(row.href ? "a" : "strong");
  name.textContent = row.title;

  if (row.href) {
    name.href = row.href;

    if (row.newTab) {
      name.target = "_blank";
      name.rel = "noopener noreferrer";
      name.setAttribute("aria-label", `${row.title} (opens in a new tab)`);
    }
  }

  const detail = document.createElement("span");
  detail.textContent = row.detail;

  if (row.icon) {
    const identity = document.createElement("div");
    identity.style.display = "flex";
    identity.style.alignItems = "center";
    identity.style.gap = "8px";
    identity.append(row.icon, name);
    item.append(identity, detail);
  } else {
    item.append(name, detail);
  }

  return item;
}

export function createWorkspacePanel(section) {
  const panel = document.createElement("section");
  panel.className = "course-workspace-panel";
  panel.setAttribute("aria-labelledby", `course-panel-${section.id}`);

  const header = document.createElement("div");
  header.className = "course-panel-header";

  const title = document.createElement("h2");
  title.id = `course-panel-${section.id}`;
  title.textContent = section.label;

  const count = document.createElement("span");
  count.className = "course-panel-count";
  count.hidden = true;
  header.append(title, count);

  const status = document.createElement("p");
  status.className = "course-panel-status";
  status.setAttribute("role", "status");
  status.textContent = `Loading ${section.label.toLowerCase()}…`;

  const list = document.createElement("ul");
  list.className = "course-panel-list";
  list.hidden = true;

  const link = document.createElement("a");
  link.className = "course-panel-link";
  link.href = section.route;
  link.textContent = section.id === "resources"
    ? "Open Repositories"
    : `Open ${section.label}`;

  panel.append(header, status, list, link);

  return {
    element: panel,

    showRows(rows, decorateRow) {
      count.hidden = false;
      count.textContent = String(rows.length);
      list.hidden = rows.length === 0;
      list.replaceChildren(...rows.map((row) => {
        const item = createWorkspaceRow(row);
        decorateRow?.(row, item);
        return item;
      }));
      status.textContent = rows.length ? "" : section.empty;
    },

    showError() {
      status.textContent = `Couldn’t load ${section.label.toLowerCase()}.`;
    },
  };
}