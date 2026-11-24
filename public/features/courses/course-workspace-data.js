import { normalizeCourseCode } from "../../services/course-catalog.js";
import { loadQuizzes } from "../../services/quiz-catalog.js";
import {
  loadResourceCatalog,
  resolveResourceUrl,
  resourceTypeLabel,
} from "../../services/resource-catalog.js";

function readTasks() {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  return tasks;
}

function describeTask(task) {
  const detail = task.completed
    ? "Completed"
    : task.status === "in-progress" ? "In progress" : "Open";

  return { title: task.title, detail };
}

function describeQuiz(quiz) {
  const count = quiz.questions.length;

  return {
    title: quiz.title,
    detail: `${count} ${count === 1 ? "question" : "questions"}`,
    href: quiz.id == null ? null : `#/quizzes/${encodeURIComponent(quiz.id)}`,
  };
}

function describeResource(resource) {
  return {
    title: resource.title,
    detail: resourceTypeLabel(resource),
    href: resolveResourceUrl(resource.url)?.href,
    newTab: true,
  };
}

export const workspaceSections = [
  {
    id: "tasks",
    label: "Tasks",
    route: "#/tasks",
    load: readTasks,
    describe: describeTask,
    empty: "No tasks linked to this course.",
  },
  {
    id: "quizzes",
    label: "Quizzes",
    route: "#/quizzes",
    load: loadQuizzes,
    describe: describeQuiz,
    empty: "No quizzes linked to this course.",
  },
  {
    id: "resources",
    label: "Resources",
    route: "#/repositories",
    load: loadResourceCatalog,
    describe: describeResource,
    empty: "No resources linked to this course.",
  },
];

export async function loadWorkspaceRows(section, code) {
  const items = await section.load();

  return items
    .filter((item) =>
      typeof item?.title === "string" &&
      normalizeCourseCode(item.courseCode) === code,
    )
    .map(section.describe);
}