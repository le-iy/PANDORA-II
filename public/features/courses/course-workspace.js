import { loadCourseCatalog } from "../../services/course-catalog.js";
import { loadQuizzes } from "../../services/quiz-catalog.js";
import {
  loadResourceCatalog,
  resolveResourceUrl,
  resourceTypeLabel,
} from "../../services/resource-catalog.js";

function normalizeCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function readTasks() {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  return tasks;
}

function showItems(list, result, courseCode, describe, emptyMessage, errorMessage) {
  if (result.status === "rejected") {
    console.error(errorMessage, result.reason);
  }

  const entries = (result.value ?? []).filter(
    (item) =>
      typeof item?.title === "string" &&
      normalizeCode(item.courseCode) === courseCode,
  );

  if (entries.length === 0) {
    const message = document.createElement("li");
    message.textContent = result.status === "rejected" ? errorMessage : emptyMessage;
    list.replaceChildren(message);
    return;
  }

  const rows = entries.map((entry) => {
    const { detail, href, newTab = false } = describe(entry);
    const row = document.createElement("li");
    const title = document.createElement(href ? "a" : "strong");
    title.textContent = entry.title;

    if (href) {
      title.href = href;

      if (newTab) {
        title.target = "_blank";
        title.rel = "noopener noreferrer";
        title.setAttribute("aria-label", `${entry.title} (opens in a new tab)`);
      }
    }

    row.append(title, ` · ${detail}`);
    return row;
  });

  list.replaceChildren(...rows);
}

export async function renderCourseWorkspace(container, code) {
  const workspace = document.createElement("section");
  workspace.className = "course-workspace";

  workspace.innerHTML = `
    <a href="#/courses">Back to Courses</a>
    <h1>Course workspace</h1>
    <p data-course-status role="status">Loading course…</p>

    <div data-course-content hidden>
      <section aria-labelledby="course-tasks-heading">
        <h2 id="course-tasks-heading">Tasks</h2>
        <ul data-course-tasks><li>Loading tasks…</li></ul>
        <a href="#/tasks">Open Tasks</a>
      </section>

      <section aria-labelledby="course-quizzes-heading">
        <h2 id="course-quizzes-heading">Quizzes</h2>
        <ul data-course-quizzes><li>Loading quizzes…</li></ul>
        <a href="#/quizzes">Open Quizzes</a>
      </section>

      <section aria-labelledby="course-resources-heading">
        <h2 id="course-resources-heading">Resources</h2>
        <ul data-course-resources><li>Loading resources…</li></ul>
        <a href="#/repositories">Open Repositories</a>
      </section>
    </div>
  `;

  container.replaceChildren(workspace);

  const heading = workspace.querySelector("h1");
  const status = workspace.querySelector("[data-course-status]");
  const courseCode = normalizeCode(code);
  let course;

  try {
    const catalog = await loadCourseCatalog();
    course = catalog.find((item) => normalizeCode(item.code) === courseCode);
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

  heading.textContent = course.name;
  const type = course.type === "lecture" ? "Lecture" : "Laboratory";
  status.textContent = `${course.code} · ${type}`;
  workspace.querySelector("[data-course-content]").hidden = false;

  const [tasks, quizzes, resources] = await Promise.allSettled([
    Promise.resolve().then(readTasks),
    loadQuizzes(),
    loadResourceCatalog(),
  ]);

  if (workspace.parentElement !== container) return;

  showItems(
    workspace.querySelector("[data-course-tasks]"),
    tasks,
    courseCode,
    (task) => ({
      detail: task.completed
        ? "Completed"
        : task.status === "in-progress" ? "In progress" : "Open",
    }),
    "No tasks linked to this course.",
    "Couldn’t load tasks.",
  );

  showItems(
    workspace.querySelector("[data-course-quizzes]"),
    quizzes,
    courseCode,
    (quiz) => {
      const count = quiz.questions.length;
      return {
        detail: `${count} ${count === 1 ? "question" : "questions"}`,
        href: quiz.id == null ? null : `#/quizzes/${encodeURIComponent(quiz.id)}`,
      };
    },
    "No quizzes linked to this course.",
    "Couldn’t load quizzes.",
  );

  showItems(
    workspace.querySelector("[data-course-resources]"),
    resources,
    courseCode,
    (resource) => ({
      detail: resourceTypeLabel(resource),
      href: resolveResourceUrl(resource.url)?.href,
      newTab: true,
    }),
    "No resources linked to this course.",
    "Couldn’t load resources.",
  );
}