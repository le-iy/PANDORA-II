import {
  loadCourseCatalog,
  normalizeCourseCode,
} from "../../services/course-catalog.js";

import { createCourseIcon } from "./course-icon.js";
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

export async function renderCourseWorkspace(container, code) {
  loadStylesheet();

  const workspace = document.createElement("section");
  workspace.className = "course-detail-screen";

  workspace.innerHTML = `
    <a class="course-detail-back" href="#/courses">← Back to Courses</a>

    <header class="course-detail-header">
      <div data-course-icon></div>
      <div>
        <h1>Course workspace</h1>
        <p data-course-status role="status">Loading course…</p>
      </div>
    </header>

    <div class="course-detail-panels" data-panels hidden></div>
  `;

  container.replaceChildren(workspace);

  const heading = workspace.querySelector("h1");
  const status = workspace.querySelector("[data-course-status]");
  const panelGrid = workspace.querySelector("[data-panels]");
  const courseCode = normalizeCourseCode(code);

  let course;

  try {
    const catalog = await loadCourseCatalog();
    course = catalog.find((item) => normalizeCourseCode(item.code) === courseCode);
  } catch (error) {
    console.error("Could not load course workspace.", error);
    status.textContent = "Couldn’t load the course. Try refreshing the page.";
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

  workspace.querySelector("[data-course-icon]").append(createCourseIcon(course.code));
  heading.textContent = course.name;
  document.title = `${course.name} | PANDORA II`;
  status.textContent = `${course.code} · ${type} · ${semester}`;

  const panels = workspaceSections.map((section) => {
    const panel = createWorkspacePanel(section);
    panelGrid.append(panel.element);
    return { section, panel };
  });

  panelGrid.hidden = false;

  await Promise.all(panels.map(async ({ section, panel }) => {
    try {
      const rows = await loadWorkspaceRows(section, courseCode);
      if (workspace.parentElement === container) panel.showRows(rows);
    } catch (error) {
      console.error(`Could not load course ${section.id}.`, error);
      if (workspace.parentElement === container) panel.showError();
    }
  }));
}