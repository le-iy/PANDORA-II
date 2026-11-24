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
  link.textContent = `Open ${section.label === "Resources" ? "Repositories" : section.label}`;

  panel.append(header, status, list, link);

  return {
    element: panel,

    showRows(rows) {
      count.hidden = false;
      count.textContent = String(rows.length);

      if (rows.length === 0) {
        status.textContent = section.empty;
        return;
      }

      status.textContent = "";
      list.hidden = false;

      for (const row of rows) {
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
        item.append(name, detail);
        list.append(item);
      }
    },

    showError() {
      status.textContent = `Couldn’t load ${section.label.toLowerCase()}.`;
    },
  };
}