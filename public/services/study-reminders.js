import {
  readScheduleEvents,
  scheduleDateKey,
} from "./schedule-events.js";

import { scheduleDateHref } from "./calendar-month.js";

function readTaskReminders(today) {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  const todayKey = scheduleDateKey(today);

  return tasks
    .filter((task) =>
      typeof task?.title === "string" &&
      !task.completed &&
      typeof task.deadline === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(task.deadline) &&
      task.deadline <= todayKey,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map((task) => ({
      title: task.title,
      detail: [
        task.deadline < todayKey ? `Overdue · ${task.deadline}` : "Due today",
        task.courseCode,
      ].filter(Boolean).join(" · "),
      href: task.id == null ? "#/tasks" : `#/tasks/${encodeURIComponent(task.id)}`,
    }));
}

function readEventReminders(today) {
  return readScheduleEvents(today)
    .sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"))
    .map((event) => ({
      title: event.title,
      detail: event.time ? `Today · ${event.time}` : "Today · No time set",
      href: scheduleDateHref(today),
    }));
}

export function readStudyReminders(preferences, today = new Date()) {
  const sections = [
    {
      label: "Task reminders",
      enabled: preferences.taskReminders,
      read: readTaskReminders,
      empty: "No overdue tasks or tasks due today.",
    },
    {
      label: "Today’s events",
      enabled: preferences.eventReminders,
      read: readEventReminders,
      empty: "No events scheduled for today.",
    },
  ];

  return sections.filter(({ enabled }) => enabled).map((section) => {
    try {
      return { ...section, rows: section.read(today) };
    } catch (error) {
      console.error(`Could not load ${section.label.toLowerCase()}.`, error);
      return { ...section, rows: [], empty: "Couldn’t load these reminders." };
    }
  });
}