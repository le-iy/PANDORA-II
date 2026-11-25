import { createTaskIcon } from "../courses/course-icon.js";
import { parseScheduleDate, scheduleDateKey } from "../../services/schedule-events.js";
import { readTasks } from "../../services/task-store.js";
import { showHomeRows } from "./home-rows.js";

const dateFormat = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

function taskRow(task, deadline, todayKey) {
  let deadlineLabel = "No deadline";
  let state;

  if (deadline) {
    const key = scheduleDateKey(deadline);
    const formatted = dateFormat.format(deadline);
    deadlineLabel = `Due ${formatted}`;

    if (key < todayKey) {
      deadlineLabel = `Overdue · ${formatted}`;
      state = "overdue";
    } else if (key === todayKey) {
      deadlineLabel = "Due today";
      state = "today";
    }
  }

  return {
    icon: createTaskIcon(task),
    title: task.title,
    detail: [
      task.courseCode,
      task.status === "in-progress" ? "In progress" : "",
      deadlineLabel,
    ].filter(Boolean).join(" · "),
    state,
    href: task.id == null ? "#/tasks" : `#/tasks/${encodeURIComponent(task.id)}`,
  };
}

export function renderHomeTasks(dashboard, today = new Date()) {
  const list = dashboard.querySelector("[data-task-list]");
  const openCount = dashboard.querySelector("[data-open-count]");
  const finishedCount = dashboard.querySelector("[data-finished-count]");

  try {
    const tasks = readTasks().filter((task) => typeof task?.title === "string");
    const unfinished = tasks.filter((task) => !task.completed);
    const todayKey = scheduleDateKey(today);

    openCount.textContent = String(unfinished.length);
    finishedCount.textContent = String(tasks.length - unfinished.length);

    const rows = unfinished
      .map((task) => ({ task, deadline: parseScheduleDate(task.deadline) }))
      .sort((a, b) => {
        const first = a.deadline?.getTime() ?? Infinity;
        const second = b.deadline?.getTime() ?? Infinity;
        return first === second ? 0 : first - second;
      })
      .slice(0, 5)
      .map(({ task, deadline }) => taskRow(task, deadline, todayKey));

    showHomeRows(list, rows, "No open tasks.");
  } catch (error) {
    console.error("Could not load tasks.", error);
    openCount.textContent = "—";
    finishedCount.textContent = "—";
    showHomeRows(list, [], "Couldn’t load tasks.");
  }
}