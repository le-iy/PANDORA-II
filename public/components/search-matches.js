function normalize(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function matchRank(entry, query, terms) {
  const title = normalize(entry.title);
  const code = normalize(entry.courseCode);
  const searchText = normalize([
    entry.title,
    entry.courseCode,
    entry.category,
    entry.keywords,
  ].filter(Boolean).join(" "));

  if (!terms.every((term) => searchText.includes(term))) return -1;

  if (title === query || code === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  return 3;
}

export function findSearchMatches(entries, value) {
  const query = normalize(value);
  if (!query) return [];

  const terms = query.split(" ");

  return entries
    .map((entry) => ({ entry, rank: matchRank(entry, query, terms) }))
    .filter(({ rank }) => rank !== -1)
    .sort((a, b) => a.rank - b.rank ||
      a.entry.title.localeCompare(b.entry.title, undefined, { sensitivity: "base" }))
    .map(({ entry }) => entry);
}