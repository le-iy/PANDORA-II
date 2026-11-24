const iconDirectory = new URL("../../assets/icons/subjects/", import.meta.url);

const icons = new Map([
  ["IT0035", "subject-it0035-applied-os-lec.svg"],
  ["IT0035L", "subject-it0035l-applied-os-lab.svg"],
  ["IT0015", "subject-it0015-networking-2.svg"],
  ["IT0204", "subject-it0204-laws-and-policies.svg"],
  ["IT0037", "subject-it0037-system-analysis.svg"],
  ["IT0049", "subject-it0049-web-systems.svg"],
  ["IT0019", "subject-it0019-quanti-methods.svg"],
  ["GED0083", "subject-ged0083-physics-2-lec.svg"],
  ["GED0083L", "subject-ged0083l-physics-2-lab.svg"],
]);

export function createCourseIcon(code) {
  const normalized = String(code ?? "").trim().toUpperCase();

  const icon = document.createElement("span");
  icon.className = "course-subject-icon";
  icon.setAttribute("aria-hidden", "true");

  const fallback = () => {
    icon.textContent = normalized.slice(0, 2) || "C";
  };

  const filename = icons.get(normalized);

  if (!filename) {
    fallback();
    return icon;
  }

  const image = document.createElement("img");
  image.alt = "";
  image.addEventListener("error", fallback, { once: true });
  image.src = new URL(filename, iconDirectory).href;

  icon.append(image);
  return icon;
}