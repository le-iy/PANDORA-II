import { readPreferences } from "../../services/preferences.js";
import {
  calendarWeekdayLabels,
  calendarWeekdayOffset,
  readScheduleEvents,
  scheduleDateKey,
} from "../../services/schedule-events.js";

import { showHomeRows } from "./home-rows.js";

const monthFormat = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});

const dayFormat = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function renderHomeCalendar(panel, today = new Date()) {
  const monthHeading = panel.querySelector("[data-calendar-month]");
  const weekdays = panel.querySelector("[data-calendar-weekdays]");
  const grid = panel.querySelector("[data-calendar-days]");
  const agendaHeading = panel.querySelector("[data-agenda-heading]");
  const agendaList = panel.querySelector("[data-agenda-list]");

  const { weekStart } = readPreferences();
  const todayKey = scheduleDateKey(today);

  let selected = today;
  let month = new Date(today.getFullYear(), today.getMonth(), 1);

  for (const day of calendarWeekdayLabels(weekStart)) {
    const label = document.createElement("span");
    label.textContent = day;
    weekdays.append(label);
  }

  function showAgenda() {
    const isToday = scheduleDateKey(selected) === todayKey;
    agendaHeading.textContent = isToday ? "Today’s agenda" : dayFormat.format(selected);

    try {
      const events = readScheduleEvents(selected);

      const rows = events
        .sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"))
        .map(({ title, time }) => ({ title, detail: time || "No time set" }));

      showHomeRows(agendaList, rows, "No events for this day.");
    } catch (error) {
      console.error("Could not load agenda.", error);
      showHomeRows(agendaList, [], "Couldn’t load events.");
    }
  }

  function selectDate(date, button) {
    selected = date;
    grid.querySelector('[aria-pressed="true"]')
      ?.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-pressed", "true");
    showAgenda();
  }

  function showMonth() {
    monthHeading.textContent = monthFormat.format(month);
    grid.replaceChildren();

    const leadingDays = calendarWeekdayOffset(month, weekStart);

    for (let offset = 0; offset < leadingDays; offset += 1) {
      const blank = document.createElement("span");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
    }

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const selectedKey = scheduleDateKey(selected);

    for (let day = 1; day <= dayCount; day += 1) {
      const date = new Date(year, monthIndex, day);
      const key = scheduleDateKey(date);
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = String(day);
      button.setAttribute("aria-label", dayFormat.format(date));
      button.setAttribute("aria-pressed", String(key === selectedKey));

      if (key === todayKey) button.setAttribute("aria-current", "date");

      button.addEventListener("click", () => selectDate(date, button));
      grid.append(button);
    }
  }

  for (const button of panel.querySelectorAll("[data-month-offset]")) {
    button.addEventListener("click", () => {
      const offset = Number(button.dataset.monthOffset);
      month = new Date(month.getFullYear(), month.getMonth() + offset, 1);
      selected = scheduleDateKey(month).startsWith(todayKey.slice(0, 7))
        ? today
        : month;

      showMonth();
      showAgenda();
    });
  }

  showMonth();
  showAgenda();
}