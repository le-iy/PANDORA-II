const filters = [
  { id: "all", label: "All items", empty: "No resources yet." },
  { id: "pdf", label: "PDFs", empty: "No PDFs yet." },
  { id: "link", label: "Links", empty: "No links yet." },
  { id: "uploaded", label: "Uploaded PDFs", empty: "No uploaded PDFs yet." },
];

function matchesFilter(resource, filterId) {
  if (filterId === "all") return true;
  if (filterId === "uploaded") return resource.source === "uploaded";
  return resource.type === filterId;
}

export function createRepositoryFilters(filterBar, search, sort, onChange) {
  const buttons = new Map();
  let active = filters[0];

  for (const filter of filters) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filter.label;

    button.addEventListener("click", () => {
      active = filter;
      onChange();
    });

    buttons.set(filter.id, button);
    filterBar.append(button);
  }

  search.addEventListener("input", onChange);
  sort.addEventListener("change", onChange);

  return {
    revealSaved(resource) {
      const id = resource.source === "uploaded" ? "uploaded" : "link";
      active = filters.find((filter) => filter.id === id);
      search.value = "";
    },

    apply(resources) {
      for (const filter of filters) {
        const count = resources.filter((item) => matchesFilter(item, filter.id)).length;
        const button = buttons.get(filter.id);

        button.textContent = `${filter.label} (${count})`;
        button.setAttribute("aria-pressed", String(active.id === filter.id));
      }

      const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);

      const visible = resources.filter((resource) => {
        if (!matchesFilter(resource, active.id)) return false;

        const text = [
          resource.title,
          resource.courseCode,
          resource.filename,
          resource.type,
          resource.source === "uploaded" ? "uploaded" : "",
        ].filter(Boolean).join(" ").toLowerCase();

        return terms.every((term) => text.includes(term));
      });

      if (sort.value === "name") {
        visible.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        );
      } else {
        visible.sort((a, b) =>
          (Date.parse(b.addedAt) || 0) - (Date.parse(a.addedAt) || 0),
        );
      }

      const count = visible.length;
      const summary = count
        ? `${count} ${count === 1 ? "item" : "items"} shown`
        : terms.length
          ? "No resources match this search."
          : active.empty;

      return { visible, summary };
    },
  };
}