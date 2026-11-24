import { readPreferences } from "../../services/preferences.js";
import {
  datesInMonth,
  firstOfMonth,
  scheduleDateHref,
} from "../../services/calendar-month.js";

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
  const heading = panel.querySelector("[data-calendar-month]");
  const weekdays = panel.querySelector("[data-calendar-weekdays]");
  const grid = panel.querySelector("[data-calendar-days]");
  const agendaHeading = panel.querySelector("[data-agenda-heading]");
  const agendaList = panel.querySelector("[data-agenda-list]");
  const scheduleLink = panel.querySelector('a[href="#/schedule"]');

  const { weekStart } = readPreferences();
  const todayKey = scheduleDateKey(today);

  let selected = today;
  let month = firstOfMonth(today);

  for (const day of calendarWeekdayLabels(weekStart)) {
    const label = document.createElement("span");
    label.textContent = day;
    weekdays.append(label);
  }

  function showAgenda() {
    const isToday = scheduleDateKey(selected) === todayKey;
    const dateLabel = dayFormat.format(selected);

    agendaHeading.textContent = isToday ? "Today’s agenda" : dateLabel;
    scheduleLink.href = scheduleDateHref(selected);
    scheduleLink.textContent = "Open selected day in Schedule";
    scheduleLink.setAttribute("aria-label", `Open ${dateLabel} in Schedule`);

    try {
      const rows = readScheduleEvents(selected)
        .sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"))
        .map(({ title, time }) => ({ title, detail: time || "No time set" }));

      showHomeRows(agendaList, rows, "No events for this day.");
    } catch (error) {
      console.error("Could not load agenda.", error);
      showHomeRows(agendaList, [], "Couldn’t load events.");
    }
  }

  function showMonth() {
    heading.textContent = monthFormat.format(month);
    grid.replaceChildren();

    const leadingDays = calendarWeekdayOffset(month, weekStart);

    for (let offset = 0; offset < leadingDays; offset += 1) {
      const blank = document.createElement("span");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
    }

    for (const date of datesInMonth(month)) {
      const key = scheduleDateKey(date);
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = String(date.getDate());
      button.setAttribute("aria-label", dayFormat.format(date));
      button.setAttribute("aria-pressed", String(key === scheduleDateKey(selected)));

      if (key === todayKey) button.setAttribute("aria-current", "date");

      button.addEventListener("click", () => {
        selected = date;
        grid.querySelector('[aria-pressed="true"]')
          ?.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-pressed", "true");
        showAgenda();
      });

      grid.append(button);
    }
  }

  for (const button of panel.querySelectorAll("[data-month-offset]")) {
    button.addEventListener("click", () => {
      month = firstOfMonth(month, Number(button.dataset.monthOffset));

      selected = scheduleDateKey(month) === scheduleDateKey(firstOfMonth(today))
        ? today
        : month;

      showMonth();
      showAgenda();
    });
  }

  showMonth();
  showAgenda();
}