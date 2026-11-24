import { normalizeCourseCode } from "../../services/course-catalog.js";
import { loadQuizzes } from "../../services/quiz-catalog.js";

function readTasks() {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved task list.");

  return tasks;
}

function countByCourse(items) {
  const counts = new Map();

  for (const item of items) {
    if (typeof item?.title !== "string") continue;

    const code = normalizeCourseCode(item.courseCode);

    if (code) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }

  return counts;
}

export async function loadCourseCounts() {
  const [tasks, quizzes] = await Promise.allSettled([
    Promise.resolve().then(readTasks),
    loadQuizzes(),
  ]);

  for (const result of [tasks, quizzes]) {
    if (result.status === "rejected") {
      console.error("Could not load course activity counts.", result.reason);
    }
  }

  const taskCounts = tasks.status === "fulfilled" ? countByCourse(tasks.value) : null;
  const quizCounts = quizzes.status === "fulfilled" ? countByCourse(quizzes.value) : null;

  return (courseCode) => {
    const code = normalizeCourseCode(courseCode);

    return {
      tasks: taskCounts ? taskCounts.get(code) ?? 0 : null,
      quizzes: quizCounts ? quizCounts.get(code) ?? 0 : null,
    };
  };
}