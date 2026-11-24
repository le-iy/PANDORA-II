export const scholarBadges = Object.freeze({
  scholar: { label: "Scholar", icon: "scholar-badge.svg" },
  books: { label: "Bookkeeper", icon: "course-books.svg" },
  finisher: { label: "Quest Finisher", icon: "tasks-finished.svg" },
});

export const goalLimits = Object.freeze({
  dailyTaskGoal: { min: 1, max: 20 },
  dailyExpGoal: { min: 10, max: 1000 },
});

const iconDirectory = new URL("../assets/icons/gamification/", import.meta.url);

export function getScholarBadge(id) {
  const badge = Object.hasOwn(scholarBadges, id)
    ? scholarBadges[id]
    : scholarBadges.scholar;

  return {
    label: badge.label,
    url: new URL(badge.icon, iconDirectory).href,
  };
}

export function countTasksCompletedToday(today = new Date()) {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  const start = new Date(
    today.getFullYear(), today.getMonth(), today.getDate(),
  ).getTime();

  const end = new Date(
    today.getFullYear(), today.getMonth(), today.getDate() + 1,
  ).getTime();

  return tasks.filter((task) => {
    if (!task?.completed || typeof task.completedAt !== "string") return false;

    const completedAt = Date.parse(task.completedAt);
    return completedAt >= start && completedAt < end;
  }).length;
}

export function formatGoalProgress(current, target, unit) {
  const summary = `${current} / ${target} ${unit} today`;
  return current >= target ? `${summary} · Goal reached` : summary;
}