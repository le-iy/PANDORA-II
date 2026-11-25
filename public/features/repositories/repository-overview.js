export function formatResourceSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), 3);
  const value = bytes / (1024 ** unit);
  const format = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });

  return `${format.format(value)} ${units[unit]}`;
}

export function showRepositoryOverview(screen, resources, uploadsUnavailable) {
  const pdfs = resources.filter((item) => item.type !== "link").length;
  const links = resources.filter((item) => item.type === "link").length;
  const uploads = resources.filter((item) => item.source === "uploaded");
  const bytes = uploads.reduce((total, item) => total + (item.sizeBytes ?? 0), 0);

  const storage = uploadsUnavailable ? "Unavailable" : formatResourceSize(bytes);
  const knownCount = (count) => uploadsUnavailable ? `${count}+` : String(count);

  const stats = [
    ["All items", knownCount(resources.length), "lavender"],
    ["Document files", knownCount(pdfs), "rose"],
    ["Links", String(links), "mint"],
    ["Uploaded size", storage, "yellow"],
  ];

  const tiles = stats.map(([label, value, tone]) => {
    const tile = document.createElement("div");
    tile.className = "repository-stat";
    tile.dataset.tone = tone;

    const title = document.createElement("dt");
    title.textContent = label;

    const count = document.createElement("dd");
    count.textContent = value;

    tile.append(title, count);
    return tile;
  });

  screen.querySelector("[data-repository-stats]").replaceChildren(...tiles);
  screen.querySelector("[data-collection-pdfs]").textContent = knownCount(pdfs);
  screen.querySelector("[data-collection-links]").textContent = String(links);
  screen.querySelector("[data-collection-uploads]").textContent =
    uploadsUnavailable ? "Unavailable" : String(uploads.length);
  screen.querySelector("[data-collection-size]").textContent = storage;
}