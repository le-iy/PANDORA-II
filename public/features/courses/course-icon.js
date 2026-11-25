import { activeThemePack, celestialIcons, hangyodonIcons, kuromiIcons, nailongIcons, themeAsset, themeStorageKey } from "../../services/theme-packs.js";

const storageKey = "pandora-ii.course-icons";

const defaults = new Map([
  ["IT0035", "subject-it0035-applied-os-lec"],
  ["IT0035L", "subject-it0035l-applied-os-lab"],
  ["IT0015", "subject-it0015-networking-2"],
  ["IT0204", "subject-it0204-laws-and-policies"],
  ["IT0037", "subject-it0037-system-analysis"],
  ["IT0049", "subject-it0049-web-systems"],
  ["IT0019", "subject-it0019-quanti-methods"],
  ["GED0083", "subject-ged0083-physics-2-lec"],
  ["GED0083L", "subject-ged0083l-physics-2-lab"],
]);

const groups = [
  ["Subjects", "icons/subjects", [
    "biology", "chemistry", "geography", "history", "mathematics", "music",
    ["subject-it0035-applied-os-lec", "Computing"],
    ["subject-it0035l-applied-os-lab", "Computing lab"],
    ["subject-it0015-networking-2", "Networking"],
    ["subject-it0204-laws-and-policies", "Law"],
    ["subject-it0037-system-analysis", "System analysis"],
    ["subject-it0049-web-systems", "Web systems"],
    ["subject-it0019-quanti-methods", "Quantitative methods"],
    ["subject-ged0083-physics-2-lec", "Physics"],
    ["subject-ged0083l-physics-2-lab", "Physics lab"],
  ]],
  ["Study tools", "icons/study-tools", [
    "assignment", "bookmark", "exam-prep", "flashcards", "research", "study-timer",
  ]],
  ["Badges & rewards", "icons/gamification", [
    "bronze-medal", "silver-medal", "gold-medal", "trophy", "crown",
    "mastery-badge", "scholar-badge", "streak-flame", "xp-star", "coin",
    "gem", "treasure-chest", "gift-box", "reward-ticket", "course-books",
  ]],
  ["Game items", "icons/gamification", [
    "gamepad", "health-heart", "energy-bolt", "mana-drop", "shield",
    "sword", "key", "target", "level-up", "inventory-bag", "mystery-item",
  ]],
  ["Trinkets", "illustrations/trinkets", [
    "lavender-sprig", "ribbon-bow", "washi-tape", "wax-seal", "desk-lamp",
    "tiny-cactus", "ink-bottle", "pencil-cup", "star-charm", "paper-crane",
    "lucky-clover", "hanging-moon", "binder-clip", "sticky-notes", "fountain-pen",
    "ruler", "eraser", "paper-clip", "latte-mug", "reading-glasses", "potted-fern",
    "candle-tin", "book-stack", "desk-clock", "mini-envelope", "acorn",
    "cloud-charm", "tiny-mushroom", "sleepy-cat-charm", "sparkle-cluster",
  ]],
].map(([label, directory, files]) => ({
  label,
  options: files.map((file) => {
    const [name, customLabel] = Array.isArray(file) ? file : [file];
    return {
      id: `${directory}/${name}.svg`,
      label: customLabel ?? name.replaceAll("-", " ").replace(/^./, (char) => char.toUpperCase()),
    };
  }),
}));

const celestialGroup = {
  label: "Celestial",
  options: Object.values(celestialIcons).map(({ label, file }) => ({ label, id: file })),
};

const nailongGroup = {
  label: "Nailong characters",
  options: Object.values(nailongIcons).map(({ label, file }) => ({ label, id: file })),
};

const hangyodonGroup = {
  label: "Hangyodon characters",
  options: Object.values(hangyodonIcons).map(({ label, file }) => ({ label, id: file })),
};

const kuromiGroup = {
  label: "Kuromi characters",
  options: Object.values(kuromiIcons).map(({ label, file }) => ({ label, id: file })),
};

function availableGroups() {
  const pack = activeThemePack();
  if (pack === "kuromi") return [...groups, kuromiGroup];
  if (pack === "hangyodon") return [...groups, hangyodonGroup];
  if (pack === "nailong") return [...groups, nailongGroup];
  return pack === "galaxy" ? [...groups, celestialGroup] : groups;
}

const options = new Map([...groups, celestialGroup, nailongGroup, hangyodonGroup, kuromiGroup].flatMap(({ options }) =>
  options.map((option) => [option.id, option]),
));

function hasIcon(id) {
  return options.has(id) &&
    (!id.startsWith("illustrations/celestial/") || activeThemePack() === "galaxy") &&
    (!id.startsWith("icons/profile/nailong-") || activeThemePack() === "nailong") &&
    (!id.startsWith("icons/profile/hangyodon-") || activeThemePack() === "hangyodon") &&
    (!id.startsWith("icons/profile/kuromi-") || activeThemePack() === "kuromi");
}

function courseKey(code) {
  return String(code ?? "").trim().toUpperCase();
}

function readIconChoices() {
  const saved = JSON.parse(localStorage.getItem(themeStorageKey(storageKey)) ?? "{}");

  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    throw new Error("Invalid saved course icons.");
  }

  return new Map(Object.entries(saved));
}

export function getCourseIconChoice(code) {
  try {
    const id = readIconChoices().get(courseKey(code));
    return hasIcon(id) ? id : "";
  } catch (error) {
    console.error("Could not read course icons.", error);
    return "";
  }
}

export function getCourseIconLabel(id) {
  return options.get(id)?.label ?? "Default icon";
}

export function saveCourseIconChoice(code, id) {
  const key = courseKey(code);

  if (!key || (id !== "" && !hasIcon(id))) {
    throw new Error("Invalid course icon selection.");
  }

  const choices = readIconChoices();

  if (id) choices.set(key, id);
  else choices.delete(key);

  localStorage.setItem(themeStorageKey(storageKey), JSON.stringify(Object.fromEntries(choices)));
}

export function createCourseIcon(code, choice = getCourseIconChoice(code)) {
  const key = courseKey(code);
  const icon = document.createElement("span");
  icon.className = "course-subject-icon";
  icon.setAttribute("aria-hidden", "true");

  const defaultFile = defaults.get(key);
  const path = hasIcon(choice)
    ? choice
    : defaultFile ? `icons/subjects/${defaultFile}.svg` : "";

  function showFallback() {
    icon.textContent = key.slice(0, 2) || "C";
  }

  if (!path) {
    showFallback();
    return icon;
  }

  const image = document.createElement("img");
  image.alt = "";
  image.width = 32;
  image.height = 32;
  image.addEventListener("error", showFallback, { once: true });
  image.src = themeAsset(path);
  icon.append(image);
  return icon;
}

export function openCourseIconPicker(trigger, { code, name, choice = "", onUse }) {
  const dialog = document.createElement("dialog");
  dialog.className = "course-dialog";
  dialog.setAttribute("aria-labelledby", "course-icon-picker-heading");
  dialog.style.width = "min(640px, calc(100% - 24px))";

  dialog.innerHTML = `
    <h2 id="course-icon-picker-heading">Choose course icon</h2>
    <p data-course-name></p>

    <form>
      <label>
        Icon category
        <select data-category></select>
      </label>

      <div data-icons role="group" aria-label="Icons in this category"></div>
      <p data-selection aria-live="polite"></p>
      <p class="course-feedback" role="status"></p>

      <div class="course-dialog-actions">
        <button type="button" data-default>Use default</button>
        <button type="button" data-cancel>Cancel</button>
        <button class="course-primary-button" type="submit">Use icon</button>
      </div>
    </form>
  `;

  const form = dialog.querySelector("form");
  const category = form.querySelector("[data-category]");
  const grid = form.querySelector("[data-icons]");
  const selection = form.querySelector("[data-selection]");
  const status = form.querySelector('[role="status"]');

  let selected = hasIcon(choice) ? choice : "";

  dialog.querySelector("[data-course-name]").textContent =
    name ? `Pick an icon for ${name}.` : "Pick an icon for this course.";

  Object.assign(grid.style, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 105px), 1fr))",
    gap: "8px",
  });

  const iconGroups = availableGroups();
  for (const [index, group] of iconGroups.entries()) {
    category.add(new Option(group.label, String(index)));
  }

  const initialCategory = iconGroups.findIndex(({ options }) =>
    options.some(({ id }) => id === selected),
  );
  category.value = String(Math.max(0, initialCategory));

  function syncSelection() {
    selection.textContent = `Selected: ${getCourseIconLabel(selected)}`;

    for (const button of grid.querySelectorAll("button")) {
      const active = button.dataset.icon === selected;
      button.setAttribute("aria-pressed", String(active));
      button.style.borderColor = active ? "var(--color-primary)" : "";
      button.style.background = active ? "var(--color-surface-muted)" : "";
    }
  }

  function showIcons() {
    const buttons = iconGroups[Number(category.value)].options.map(({ id, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.icon = id;
      Object.assign(button.style, {
        display: "grid",
        justifyItems: "center",
        alignContent: "center",
        gap: "6px",
        minWidth: "0",
        minHeight: "76px",
        whiteSpace: "normal",
      });

      button.append(createCourseIcon(code, id), document.createTextNode(label));
      button.addEventListener("click", () => {
        selected = id;
        status.textContent = "";
        syncSelection();
      });

      return button;
    });

    grid.replaceChildren(...buttons);
    syncSelection();
  }

  category.addEventListener("change", showIcons);
  form.querySelector("[data-default]").addEventListener("click", () => {
    selected = "";
    status.textContent = "";
    syncSelection();
  });

  form.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      onUse(selected);
      dialog.close();
    } catch (error) {
      console.error("Could not save course icon.", error);
      status.textContent = "Couldn’t save this icon. Try again.";
    }
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  showIcons();
  document.body.append(dialog);
  dialog.showModal();
  category.focus();
}