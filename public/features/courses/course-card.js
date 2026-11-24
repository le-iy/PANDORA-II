import {
  createCourseIcon,
  getCourseIconChoice,
  getCourseIconLabel,
  openCourseIconPicker,
  saveCourseIconChoice,
} from "./course-icon.js";

const colorKey = "pandora-ii.course-card-colors";
const hexColor = /^#[0-9a-f]{6}$/i;
const presets = [
  ["Lavender", "#c9a7e5"],
  ["Rose", "#e7a6c8"],
  ["Mint", "#94d2b4"],
  ["Butter yellow", "#e8c761"],
  ["Sky blue", "#91bfe9"],
  ["Peach", "#ecae85"],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readColors() {
  const saved = JSON.parse(localStorage.getItem(colorKey) ?? "{}");

  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    throw new Error("Invalid saved course colors.");
  }

  return new Map(Object.entries(saved));
}

function getColor(code) {
  try {
    const color = readColors().get(code);
    return typeof color === "string" && hexColor.test(color) ? color : "";
  } catch (error) {
    console.error("Could not read course colors.", error);
    return "";
  }
}

function saveColor(code, color) {
  if (color && !hexColor.test(color)) throw new Error("Invalid course color.");

  const colors = readColors();
  if (color) colors.set(code, color);
  else colors.delete(code);

  localStorage.setItem(colorKey, JSON.stringify(Object.fromEntries(colors)));
}

function tint(color) {
  return color ? `color-mix(in srgb, ${color} 30%, var(--color-surface))` : "";
}

function openAppearance(card, trigger, course) {
  const screen = card.closest(".courses-screen") ?? card.parentElement;
  const dialog = element("dialog", "course-dialog");
  dialog.setAttribute("aria-labelledby", "course-appearance-heading");

  dialog.innerHTML = `
    <h2 id="course-appearance-heading">Customize course card</h2>

    <form>
      <div data-appearance-preview>
        <div data-icon-preview></div>
        <div>
          <strong data-course-name></strong>
          <p data-course-code></p>
        </div>
      </div>

      <div class="course-dialog-actions">
        <span data-icon-label></span>
        <button type="button" data-choose-icon aria-haspopup="dialog">Choose icon</button>
        <button type="button" data-default-icon>Use default icon</button>
      </div>

      <label>
        Card color
        <select name="preset"></select>
      </label>

      <label data-custom-color hidden>
        Custom color
        <input name="custom" type="color" value="#c9a7e5">
      </label>

      <p class="course-feedback" role="status"></p>

      <div class="course-dialog-actions">
        <button type="button" data-cancel>Cancel</button>
        <button class="course-primary-button" type="submit">Save appearance</button>
      </div>
    </form>
  `;

  const form = dialog.querySelector("form");
  const preset = form.elements.namedItem("preset");
  const custom = form.elements.namedItem("custom");
  const customLabel = form.querySelector("[data-custom-color]");
  const preview = form.querySelector("[data-appearance-preview]");
  const iconPreview = form.querySelector("[data-icon-preview]");
  const iconLabel = form.querySelector("[data-icon-label]");
  const chooseIcon = form.querySelector("[data-choose-icon]");
  const defaultIcon = form.querySelector("[data-default-icon]");
  const status = form.querySelector('[role="status"]');

  let savedIcon = getCourseIconChoice(course.code);
  let selectedIcon = savedIcon;
  let savedColor = getColor(course.code);

  preview.querySelector("[data-course-name]").textContent = course.name;
  preview.querySelector("[data-course-code]").textContent = course.code;

  Object.assign(preview.style, {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-control)",
    overflowWrap: "anywhere",
  });

  const previousBackground = card.style.background;
  card.style.background = "";
  const defaultBackground = getComputedStyle(card).backgroundColor;
  card.style.background = previousBackground;

  preset.add(new Option("Default", ""));
  for (const [label, color] of presets) preset.add(new Option(label, color));
  preset.add(new Option("Custom color", "custom"));

  if (savedColor) {
    custom.value = savedColor;
    preset.value = presets.some(([, color]) => color === savedColor)
      ? savedColor
      : "custom";
  }

  function chosenColor() {
    return preset.value === "custom" ? custom.value : preset.value;
  }

  function showPreview() {
    const isCustom = preset.value === "custom";
    customLabel.hidden = !isCustom;
    customLabel.style.display = isCustom ? "" : "none";
    preview.style.background = tint(chosenColor()) || defaultBackground;
    iconPreview.replaceChildren(createCourseIcon(course.code, selectedIcon));
    iconLabel.textContent = getCourseIconLabel(selectedIcon);
    defaultIcon.disabled = !selectedIcon;
    status.textContent = "";
  }

  chooseIcon.addEventListener("click", () => {
    openCourseIconPicker(chooseIcon, {
      code: course.code,
      name: course.name,
      choice: selectedIcon,
      onUse(id) {
        selectedIcon = id;
        showPreview();
      },
    });
  });

  defaultIcon.addEventListener("click", () => {
    selectedIcon = "";
    showPreview();
    chooseIcon.focus();
  });

  preset.addEventListener("change", showPreview);
  custom.addEventListener("input", showPreview);
  form.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const color = chosenColor();

    try {
      if (selectedIcon !== savedIcon) {
        saveCourseIconChoice(course.code, selectedIcon);
        savedIcon = selectedIcon;
        trigger.replaceChildren(createCourseIcon(course.code, savedIcon));
      }
    } catch (error) {
      console.error("Could not save course icon.", error);
      status.textContent = "Couldn’t save the icon. Try again.";
      return;
    }

    try {
      if (color !== savedColor) {
        saveColor(course.code, color);
        savedColor = color;
        card.style.background = tint(savedColor);
      }
    } catch (error) {
      console.error("Could not save course color.", error);
      status.textContent = "Couldn’t save the color. Try again.";
      return;
    }

    dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  screen.append(dialog);
  showPreview();
  dialog.showModal();
  chooseIcon.focus();
}

function createProgress(course) {
  const value = Number(course.progress);

  if (course.progress == null || course.progress === "" || !Number.isFinite(value)) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, value));
  const panel = element("div", "course-progress");
  const label = element("p", "", "Progress");
  label.append(element("strong", "", `${percentage}%`));

  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = percentage;
  progress.setAttribute("aria-label", `Progress for ${course.name}`);

  panel.append(label, progress);
  return panel;
}

function describeCounts({ tasks, quizzes }) {
  return [
    tasks === null ? "Tasks unavailable" : `${tasks} ${tasks === 1 ? "task" : "tasks"}`,
    quizzes === null ? "Quizzes unavailable" : `${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}`,
  ].join(" · ");
}

export function createCourseCard(course, counts) {
  const card = element("article", "course-card");
  card.dataset.courseType = course.type;
  card.style.position = "relative";
  card.style.isolation = "isolate";
  card.style.background = tint(getColor(course.code));

  const metadata = element("div", "course-meta");
  const identity = element("div", "course-card-identity");
  const iconButton = element("button", "course-card-icon-button");
  iconButton.type = "button";
  iconButton.title = "Customize icon and color";
  iconButton.setAttribute("aria-label", `Customize appearance for ${course.name}`);
  iconButton.setAttribute("aria-haspopup", "dialog");

  Object.assign(iconButton.style, {
    position: "relative",
    zIndex: "1",
    display: "grid",
    placeItems: "center",
    flex: "none",
    minWidth: "44px",
    minHeight: "44px",
    padding: "3px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-control)",
    background: "var(--color-surface)",
    cursor: "pointer",
  });

  iconButton.append(createCourseIcon(course.code));
  iconButton.addEventListener("click", () => openAppearance(card, iconButton, course));

  identity.append(iconButton, element("p", "course-code", course.code));

  const type = course.type === "laboratory" ? "Laboratory" : "Lecture";
  metadata.append(identity, element("p", "course-type", type));

  const title = element("h2");
  const link = element("a", "course-card-link", course.name);
  link.href = `#/courses/${encodeURIComponent(course.code)}`;
  link.style.color = "inherit";
  link.style.textDecoration = "none";

  const hitArea = element("span");
  hitArea.setAttribute("aria-hidden", "true");
  Object.assign(hitArea.style, {
    position: "absolute",
    inset: "0",
    borderRadius: "var(--radius-card)",
    cursor: "pointer",
  });

  link.append(hitArea);
  title.append(link);
  card.append(metadata, title);

  if (course.semester === "previous") {
    card.append(element("p", "course-semester-label", "Previous semester"));
  }

  const progress = createProgress(course);
  if (progress) card.append(progress);

  const footer = element("div", "course-card-footer");
  const activity = element(
    "p",
    "course-card-counts",
    counts ? describeCounts(counts) : "Loading activity…",
  );

  footer.append(activity);
  card.append(footer);

  return {
    element: card,

    updateCounts(nextCounts) {
      activity.textContent = describeCounts(nextCounts);
    },
  };
}