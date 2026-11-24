import {
  createCourseIcon,
  getCourseIconChoice,
  openCourseIconPicker,
  saveCourseIconChoice,
} from "./course-icon.js";

const colorStorageKey = "pandora-ii.course-card-colors";
const hexColor = /^#[0-9a-f]{6}$/i;
const presets = [
  ["Lavender", "#c9a7e5"],
  ["Rose", "#e7a6c8"],
  ["Mint", "#94d2b4"],
  ["Butter yellow", "#e8c761"],
  ["Sky blue", "#91bfe9"],
  ["Peach", "#ecae85"],
];

function readColors() {
  const saved = JSON.parse(localStorage.getItem(colorStorageKey) ?? "{}");

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

  localStorage.setItem(colorStorageKey, JSON.stringify(Object.fromEntries(colors)));
}

function cardTint(color) {
  return `color-mix(in srgb, ${color} 30%, var(--color-surface))`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function openColorPicker(card, trigger, course) {
  const screen = card.closest(".courses-screen") ?? card.parentElement;
  const dialog = element("dialog", "course-dialog");
  dialog.setAttribute("aria-labelledby", "course-color-heading");

  dialog.innerHTML = `
    <h2 id="course-color-heading">Change card color</h2>
    <p data-course-name></p>
    <form>
      <label>
        Color preset
        <select name="preset"></select>
      </label>
      <label data-custom hidden>
        Custom color
        <input name="custom" type="color" value="#c9a7e5">
      </label>
      <div data-color-preview>
        <strong data-preview-name></strong>
        <p data-preview-code></p>
      </div>
      <p class="course-feedback" role="status"></p>
      <div class="course-dialog-actions">
        <button type="button" data-cancel>Cancel</button>
        <button class="course-primary-button" type="submit">Save color</button>
      </div>
    </form>
  `;

  const form = dialog.querySelector("form");
  const select = form.elements.namedItem("preset");
  const custom = form.elements.namedItem("custom");
  const customLabel = form.querySelector("[data-custom]");
  const preview = form.querySelector("[data-color-preview]");
  const status = form.querySelector('[role="status"]');
  const current = getColor(course.code);

  dialog.querySelector("[data-course-name]").textContent = course.name;
  preview.querySelector("[data-preview-name]").textContent = course.name;
  preview.querySelector("[data-preview-code]").textContent = course.code;

  Object.assign(preview.style, {
    padding: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-control)",
    overflowWrap: "anywhere",
  });

  select.add(new Option("Default", ""));
  for (const [label, color] of presets) select.add(new Option(label, color));
  select.add(new Option("Custom color", "custom"));

  if (current) {
    custom.value = current;
    select.value = presets.some(([, color]) => color === current) ? current : "custom";
  }

  const previousBackground = card.style.background;
  card.style.background = "";
  const defaultBackground = getComputedStyle(card).backgroundColor;
  card.style.background = previousBackground;

  function chosenColor() {
    return select.value === "custom" ? custom.value : select.value;
  }

  function showPreview() {
    const isCustom = select.value === "custom";
    customLabel.hidden = !isCustom;
    customLabel.style.display = isCustom ? "" : "none";

    const color = chosenColor();
    preview.style.background = color ? cardTint(color) : defaultBackground;
    status.textContent = "";
  }

  select.addEventListener("change", showPreview);
  custom.addEventListener("input", showPreview);
  form.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const color = chosenColor();
      saveColor(course.code, color);
      card.style.background = color ? cardTint(color) : "";
      dialog.close();
    } catch (error) {
      console.error("Could not save course card color.", error);
      status.textContent = "Couldn’t save this color. Try again.";
    }
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  screen.append(dialog);
  showPreview();
  dialog.showModal();
  select.focus();
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
    quizzes === null
      ? "Quizzes unavailable"
      : `${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}`,
  ].join(" · ");
}

export function createCourseCard(course, counts) {
  const card = element("article", "course-card");
  card.dataset.courseType = course.type;
  card.style.position = "relative";
  card.style.isolation = "isolate";

  const tint = getColor(course.code);
  if (tint) card.style.background = cardTint(tint);

  const metadata = element("div", "course-meta");
  const identity = element("div", "course-card-identity");
  const iconButton = element("button", "course-card-icon-button");
  iconButton.type = "button";
  iconButton.title = "Change icon";
  iconButton.setAttribute("aria-label", `Change icon for ${course.name}`);
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

  iconButton.addEventListener("click", () => {
    openCourseIconPicker(iconButton, {
      code: course.code,
      name: course.name,
      choice: getCourseIconChoice(course.code),
      onUse(id) {
        saveCourseIconChoice(course.code, id);
        iconButton.replaceChildren(createCourseIcon(course.code, id));
      },
    });
  });

  identity.append(iconButton, element("p", "course-code", course.code));

  const type = course.type === "laboratory" ? "Laboratory" : "Lecture";
  metadata.append(identity, element("p", "course-type", type));

  const title = element("h2");
  const link = element("a", "course-card-link", course.name);
  link.href = `#/courses/${encodeURIComponent(course.code)}`;
  link.style.color = "inherit";
  link.style.textDecoration = "none";

  // Make the real course link cover the card behind its separate controls.
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

  const actions = element("div", "course-dialog-actions");
  const changeColor = element("button", "course-primary-button", "Change color");
  changeColor.type = "button";
  changeColor.setAttribute("aria-label", `Change color for ${course.name}`);
  changeColor.setAttribute("aria-haspopup", "dialog");

  Object.assign(changeColor.style, {
    position: "relative",
    zIndex: "1",
    background: "var(--color-surface)",
    color: "var(--color-primary)",
  });

  changeColor.addEventListener("click", () => openColorPicker(card, changeColor, course));

  actions.append(changeColor);
  footer.append(activity, actions);
  card.append(footer);

  return {
    element: card,

    updateCounts(nextCounts) {
      activity.textContent = describeCounts(nextCounts);
    },
  };
}