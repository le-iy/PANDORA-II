import { taskStatusLabel } from "../features/tasks/task-details.js";

function readRecords(key) {
  const records = JSON.parse(localStorage.getItem(key) ?? "[]");

  if (!Array.isArray(records)) {
    throw new Error(`Invalid saved data for ${key}.`);
  }

  return records.filter((record) => typeof record?.title === "string");
}

export function loadStudyReport(type) {
  if (type === "tasks") {
    return {
      filename: "pandora-ii-tasks.csv",
      columns: ["Task", "Course code", "Deadline", "Status", "Completed at"],
      rows: readRecords("pandora-ii.tasks").map((task) => [
        task.title,
        task.courseCode ?? "",
        task.deadline ?? "",
        taskStatusLabel(task),
        task.completed ? task.completedAt ?? "" : "",
      ]),
    };
  }

  if (type === "quiz-attempts") {
    return {
      filename: "pandora-ii-quiz-attempts.csv",
      columns: ["Quiz", "Course code", "Score", "Questions", "Submitted at"],
      rows: readRecords("pandora-ii.quiz-history").map((attempt) => [
        attempt.title,
        attempt.courseCode ?? "",
        attempt.score ?? "",
        attempt.total ?? "",
        attempt.finishedAt ?? "",
      ]),
    };
  }

  throw new Error("Unknown report type.");
}