import {
  loadCourseCatalog,
  normalizeCourseCode,
} from "../../services/course-catalog.js";

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
    <p data-icon-feedback role="status" hidden></p>
    <div class="course-detail-panels" data-panels hidden></div>
  `;

  container.replaceChildren(workspace);

  const heading = workspace.querySelector("h1");
  const status = workspace.querySelector("[data-course-status]");
  const codeLabel = workspace.querySelector("[data-course-code]");
  const navigation = workspace.querySelector("nav");
  const panelGrid = workspace.querySelector("[data-panels]");
  const courseCode = normalizeCourseCode(code);

  let course;

  try {
    const catalog = await loadCourseCatalog();
    course = catalog.find((item) => normalizeCourseCode(item.code) === courseCode);
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

  const type = course.type === "laboratory" ? "Laboratory" : "Lecture";
  const semester = course.semester === "previous"
    ? "Previous semester"
    : "Current semester";

  const iconSlot = workspace.querySelector("[data-course-icon]");
  iconSlot.append(createCourseIcon(course.code));
  codeLabel.textContent = course.code;
  codeLabel.hidden = false;
  heading.textContent = course.name;
  document.title = `${course.name} | PANDORA II`;
  status.textContent = `${type} · ${semester}`;
  showCourseProgress(workspace, course);

  const panels = workspaceSections.map((section) => {
    const panel = createWorkspacePanel(section);
    const panelHeading = panel.element.querySelector("h2");
    const control = document.createElement("button");
    const label = document.createElement("span");
    const count = document.createElement("span");

    panel.element.dataset.courseSection = section.id;
    panelHeading.tabIndex = -1;

    control.type = "button";
    control.className = "course-detail-shortcut";
    label.textContent = section.label;
    count.className = "course-detail-shortcut-count";
    count.hidden = true;
    control.append(label, count);

    control.addEventListener("click", () => {
      panelHeading.focus({ preventScroll: true });
      panel.element.scrollIntoView({ block: "nearest" });
    });

    navigation.append(control);
    panelGrid.append(panel.element);

    return { section, panel, count };
  });

  const changeIcon = document.createElement("button");
  changeIcon.type = "button";
  changeIcon.className = "course-detail-shortcut";
  changeIcon.textContent = "Change icon";
  changeIcon.setAttribute("aria-haspopup", "dialog");

  const iconFeedback = workspace.querySelector("[data-icon-feedback]");

  changeIcon.addEventListener("click", () => {
    openCourseIconPicker(changeIcon, {
      code: course.code,
      name: course.name,
      choice: getCourseIconChoice(course.code),
      onUse(id) {
        saveCourseIconChoice(course.code, id);
        iconSlot.replaceChildren(createCourseIcon(course.code, id));
        iconFeedback.hidden = false;
        iconFeedback.textContent = id ? "Course icon updated." : "Default course icon restored.";
      },
    });
  });

  navigation.append(changeIcon);
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