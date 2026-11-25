export function showHomeRows(list, entries, emptyMessage) {
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "home-empty";
    empty.textContent = emptyMessage;
    list.replaceChildren(empty);
    return;
  }

  const rows = entries.map(({ title, detail, state, href, newTab, icon, badge, quizProgress }) => {
    const row = document.createElement("li");
    row.className = "home-data-row";

    const copy = document.createElement("div");
    copy.className = "home-row-copy";

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

    copy.append(name);

    if (detail) {
      const description = document.createElement("span");
      description.textContent = detail;
      if (state) description.dataset.state = state;
      copy.append(description);
    }

    if (quizProgress) {
      const meter = document.createElement("progress");
      meter.max = quizProgress.max;
      meter.value = quizProgress.value;
      meter.setAttribute("aria-label", "Questions answered for " + title);
      Object.assign(meter.style, { display: "block", height: "6px", marginTop: "2px" });
      copy.append(meter);
    }

    if (icon) row.append(icon);
    row.append(copy);
    if (badge) {
      const status = document.createElement("span");
      status.className = "home-quiz-status";
      status.dataset.status = state;
      status.textContent = badge;
      row.append(status);
    }
    return row;
  });

  list.replaceChildren(...rows);
}