import { renderHeader } from "./components/header.js";
import { renderSidebar } from "./components/sidebar.js";
import { startRouter } from "./services/router.js";
import { renderHome } from "./features/home/home.js";
import { renderCourses } from "./features/courses/courses.js";
import { renderCourseWorkspace } from "./features/courses/course-workspace.js";
import { renderQuizzes } from "./features/quizzes/quizzes.js";
import { renderRepositories } from "./features/repositories/repositories.js";
import { renderSchedule } from "./features/schedule/schedule.js";
import { renderTasks } from "./features/tasks/tasks.js";
import {
  applySavedSettings,
  renderSettings,
} from "./features/settings/settings.js";

const sidebar = document.querySelector("#app-sidebar");
const header = document.querySelector("#app-header");
const content = document.querySelector("#app-content");

const pages = {
  home: { title: "Home", render: renderHome },
  courses: { title: "Courses", render: renderCourses },
  quizzes: { title: "Quizzes", render: renderQuizzes },
  repositories: { title: "Repositories", render: renderRepositories },
  schedule: { title: "Schedule", render: renderSchedule },
  tasks: { title: "Tasks", render: renderTasks },
  settings: { title: "Settings", render: renderSettings },
};

let currentRoute = null;

function renderPage(pageId, {
  courseCode,
  quizId,
  taskId,
  scheduleDate,
  resourceId,
} = {}) {
  const page = pages[pageId];
  const detail = courseCode ?? quizId ?? taskId ?? scheduleDate ?? resourceId;
  const route = detail ? `${pageId}/${detail}` : pageId;
  const changed = currentRoute !== null && currentRoute !== route;
  currentRoute = route;

  document.querySelector("dialog[data-schedule-route]:modal")?.close();

  document.title = `${courseCode || page.title} | PANDORA II`;
  renderSidebar(sidebar, pageId);

  if (courseCode) {
    renderCourseWorkspace(content, courseCode);
  } else if (quizId) {
    renderQuizzes(content, "course", quizId);
  } else if (taskId) {
    renderTasks(content, taskId);
  } else if (scheduleDate) {
    renderSchedule(content, scheduleDate);
  } else if (resourceId) {
    renderRepositories(content, resourceId);
  } else {
    page.render(content);
  }

  if (changed) {
    window.scrollTo(0, 0);

    if (!document.querySelector("dialog:modal")) {
      const target = content.querySelector("h1") ?? content;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
}

applySavedSettings();
renderHeader(header);
startRouter(Object.keys(pages), renderPage);

window.addEventListener("pandora:theme-pack-changed", () => {
  renderSidebar(sidebar, currentRoute?.split("/")[0] ?? "home");
  renderHeader(header);
});
