import {
  loadCourseCatalog,
  normalizeCourseCode,
  saveCourseName,
} from "../../services/course-catalog.js";
import { openDeleteCourse } from "./course-delete.js";
import {
  createCourseIcon,
  getCourseIconChoice,
  openCourseIconPicker,
  saveCourseIconChoice,
} from "./course-icon.js";
import { loadWorkspaceRows, workspaceSections } from "./course-workspace-data.js";
import { createWorkspacePanel } from "./course-workspace-panel.js";

const stylesheetUrl = new URL("../../styles/course-workspace.css", import.meta.url);

function loadStylesheet() {
  if (document.head.querySelector("[data-course-workspace-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = stylesheetUrl.href;
  link.dataset.courseWorkspaceStyles = "";
  document.head.append(link);
}

function showCourseProgress(workspace, course) {
  const section = workspace.querySelector("[data-course-progress]");
  const label = section.querySelector("[data-progress-label]");
  const bar = section.querySelector("progress");
  const value = Number(course.progress);

  section.hidden = false;

  if (course.progress == null || course.progress === "" || !Number.isFinite(value)) {
    label.textContent = "No progress recorded";
    return;
  }

  const percentage = Math.min(100, Math.max(0, value));
  label.textContent = `${percentage}%`;
  bar.value = percentage;
  bar.hidden = false;
}

function openRenameCourse(workspace, trigger, course, onSaved) {
  const dialog = document.createElement("dialog");
  dialog.className = "header-search-dialog";
  dialog.setAttribute("aria-labelledby", "course-rename-heading");

  dialog.innerHTML = `
    <header class="search-dialog-heading">
      <h2 id="course-rename-heading">Rename course</h2>
    </header>
    <form>
      <label>
        Course name
        <input class="header-search" name="courseName" maxlength="120" required>
      </label>
      <p role="status"></p>
      <div class="course-detail-navigation">
        <button class="course-detail-shortcut" type="button" data-cancel>Cancel</button>
        <button class="course-detail-shortcut" type="submit">Save name</button>
      </div>
    </form>
  `;

  const form = dialog.querySelector("form");
  const input = form.elements.namedItem("courseName");
  const status = form.querySelector('[role="status"]');
  input.value = course.name;

  form.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
  input.addEventListener("input", () => { status.textContent = ""; });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();

    if (!name) {
      status.textContent = "Enter a course name.";
      input.focus();
      return;
    }

    let savedName;

    try {
      savedName = name === course.name ? name : saveCourseName(course.code, name);
    } catch (error) {
      console.error("Could not rename course.", error);
      status.textContent = "Couldn’t save the name. Try again.";
      return;
    }

    onSaved(savedName);
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  workspace.append(dialog);
  dialog.showModal();
  input.select();
}

export async function renderCourseWorkspace(container, code) {
  loadStylesheet();

  const workspace = document.createElement("section");
  workspace.className = "course-detail-screen";
  workspace.setAttribute("aria-labelledby", "course-workspace-heading");

  workspace.innerHTML = `
    <a class="course-detail-back" href="#/courses">← Back to Courses</a>

    <header class="course-detail-header">
      <div class="course-detail-identity">
        <div data-course-icon></div>
        <div>
          <p class="course-detail-code" data-course-code hidden></p>
          <h1 id="course-workspace-heading">Course workspace</h1>
          <p class="course-detail-meta" data-course-status role="status">Loading course…</p>
        </div>
      </div>

      <div class="course-detail-progress" data-course-progress hidden>
        <p>
          <span>Course progress</span>
          <strong data-progress-label></strong>
        </p>
        <progress max="100" aria-label="Course progress" hidden></progress>
      </div>
    </header>

    <nav class="course-detail-navigation" aria-label="Course sections" hidden></nav>
    <p data-course-feedback role="status" hidden></p>
    <div class="course-detail-panels" data-panels hidden></div>
  `;

  container.replaceChildren(workspace);

  const heading = workspace.querySelector("h1");
  const status = workspace.querySelector("[data-course-status]");
  const codeLabel = workspace.querySelector("[data-course-code]");
  const navigation = workspace.querySelector("nav");
  const panelGrid = workspace.querySelector("[data-panels]");
  const feedback = workspace.querySelector("[data-course-feedback]");
  const courseCode = normalizeCourseCode(code);
  let course;

  try {
    const catalog = await loadCourseCatalog();
    course = catalog.find((item) => item.code === courseCode);
  } catch (error) {
    console.error("Could not load course workspace.", error);
    if (workspace.parentElement === container) {
      status.textContent = "Couldn’t load the course. Try refreshing the page.";
    }
    return;
  }

  if (workspace.parentElement !== container) return;

  if (!course) {
    heading.textContent = "Course not found";
    status.textContent = `No course matches ${courseCode}.`;
    return;
  }

  function showCourseName() {
    heading.textContent = course.name;
    document.title = `${course.name} | PANDORA II`;
  }

  function showFeedback(message) {
    feedback.hidden = false;
    feedback.textContent = message;
  }

  function addShortcut(label, action, opensDialog = false) {
    const control = document.createElement("button");
    control.type = "button";
    control.className = "course-detail-shortcut";
    control.textContent = label;
    if (opensDialog) control.setAttribute("aria-haspopup", "dialog");
    control.addEventListener("click", () => action(control));
    navigation.append(control);
    return control;
  }

  const type = course.type === "laboratory" ? "Laboratory" : "Lecture";
  const semester = course.semester === "previous" ? "Previous semester" : "Current semester";
  const iconSlot = workspace.querySelector("[data-course-icon]");

  iconSlot.append(createCourseIcon(course.code));
  codeLabel.textContent = course.code;
  codeLabel.hidden = false;
  showCourseName();
  status.textContent = `${type} · ${semester}`;
  showCourseProgress(workspace, course);

  const panels = workspaceSections.map((section) => {
    const panel = createWorkspacePanel(section);
    const panelHeading = panel.element.querySelector("h2");
    panel.element.dataset.courseSection = section.id;
    panelHeading.tabIndex = -1;

    const control = addShortcut(section.label, () => {
      panelHeading.focus({ preventScroll: true });
      panel.element.scrollIntoView({ block: "nearest" });
    });

    const count = document.createElement("span");
    count.className = "course-detail-shortcut-count";
    count.hidden = true;
    control.append(count);
    panelGrid.append(panel.element);

    return { section, panel, count };
  });

  addShortcut("Change icon", (trigger) => {
    openCourseIconPicker(trigger, {
      code: course.code,
      name: course.name,
      choice: getCourseIconChoice(course.code),
      onUse(id) {
        saveCourseIconChoice(course.code, id);
        iconSlot.replaceChildren(createCourseIcon(course.code, id));
        showFeedback(id ? "Course icon updated." : "Default course icon restored.");
      },
    });
  }, true);

  addShortcut("Rename course", (trigger) => {
    openRenameCourse(workspace, trigger, course, (name) => {
      course.name = name;
      showCourseName();
      showFeedback("Course name saved.");
    });
  }, true);

  const deleteButton = addShortcut("Delete course", (trigger) => {
    openDeleteCourse(workspace, trigger, course);
  }, true);
  deleteButton.style.color = "var(--color-danger)";

  navigation.hidden = false;
  panelGrid.hidden = false;

  await Promise.all(panels.map(async ({ section, panel, count }) => {
    try {
      const rows = await loadWorkspaceRows(section, courseCode);
      if (workspace.parentElement !== container) return;

      panel.showRows(rows);
      count.textContent = String(rows.length);
      count.hidden = false;
    } catch (error) {
      console.error(`Could not load course ${section.id}.`, error);
      if (workspace.parentElement === container) panel.showError();
    }
  }));
}