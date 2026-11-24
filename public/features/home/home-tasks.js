import {
  parseScheduleDate,
  scheduleDateKey,
} from "../../services/schedule-events.js";

import { showHomeRows } from "./home-rows.js";

const storageKey = "pandora-ii.tasks";

const dateFormat = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

function readTasks() {
  const tasks = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  return tasks.filter((task) => typeof task?.title === "string");
}

function taskRow(task, deadline, todayKey) {
  let deadlineLabel = "No deadline";
  let state;

  if (deadline) {
    const key = scheduleDateKey(deadline);
    deadlineLabel = `Due ${dateFormat.format(deadline)}`;

    if (key < todayKey) {
      deadlineLabel = `Overdue · ${dateFormat.format(deadline)}`;
      state = "overdue";
    } else if (key === todayKey) {
      deadlineLabel = "Due today";
      state = "today";
    }
  }

  return {
    title: task.title,
    detail: [
      task.courseCode,
      task.status === "in-progress" ? "In progress" : "",
      deadlineLabel,
    ].filter(Boolean).join(" · "),
    state,
  };
}

export function renderHomeTasks(dashboard, today = new Date()) {
  const list = dashboard.querySelector("[data-task-list]");
  const openCount = dashboard.querySelector("[data-open-count]");
  const finishedCount = dashboard.querySelector("[data-finished-count]");

  try {
    const tasks = readTasks();
    const unfinished = tasks.filter((task) => !task.completed);
    const todayKey = scheduleDateKey(today);

    openCount.textContent = String(unfinished.length);
    finishedCount.textContent = String(tasks.length - unfinished.length);

    const rows = unfinished
      .map((task) => ({
        task,
        deadline: parseScheduleDate(task.deadline),
      }))
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