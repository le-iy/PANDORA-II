import { loadCourseCatalog } from "../services/course-catalog.js";
import { loadQuizzes } from "../services/quiz-catalog.js";
import {
  loadResourceCatalog,
  resourceTypeLabel,
} from "../services/resource-catalog.js";
import { taskStatusLabel } from "../features/tasks/task-details.js";
import { resourceDetailsHref } from "../features/repositories/resource-card.js";

function itemRoute(page, id) {
  return id == null || id === ""
    ? `#/${page}`
    : `#/${page}/${encodeURIComponent(id)}`;
}

function readTasks() {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  return tasks.filter((task) => typeof task?.title === "string");
}

export async function loadSearchIndex() {
  let uploadedPdfsUnavailable = false;

  const sources = await Promise.allSettled([
    loadCourseCatalog(),
    Promise.resolve().then(readTasks),
    loadQuizzes(),
    loadResourceCatalog({
      onPdfError() {
        uploadedPdfsUnavailable = true;
      },
    }),
  ]);

  const [courses, tasks, quizzes, resources] = sources.map(
    (source) => source.status === "fulfilled" ? source.value : [],
  );

  const entries = [
    ...courses.map((course) => ({
      title: course.name,
      courseCode: course.code,
      category: "Course",
      href: itemRoute("courses", course.code),
    })),
    ...tasks.map((task) => ({
      title: task.title,
      courseCode: task.courseCode,
      category: `Task · ${taskStatusLabel(task)}`,
      href: itemRoute("tasks", task.id),
    })),
    ...quizzes.map((quiz) => ({
      title: quiz.title,
      courseCode: quiz.courseCode,
      category: "Quiz",
      href: itemRoute("quizzes", quiz.id),
    })),
    ...resources.map((resource) => ({
      title: resource.title,
      courseCode: resource.courseCode,
      category: resourceTypeLabel(resource),
      keywords: resource.filename,
      href: resourceDetailsHref(resource) ?? "#/repositories",
    })),
  ].filter((entry) => typeof entry.title === "string" && entry.title.trim());

  return {
    entries,
    partial: uploadedPdfsUnavailable ||
      sources.some((source) => source.status === "rejected"),
  };
}