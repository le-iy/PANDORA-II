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

function readDay(date) {
  try {
    return readScheduleEvents(date);
  } catch (error) {
    console.error("Could not load calendar events.", error);
    return null;
  }
}

export function renderHomeCalendar(panel, today = new Date()) {
  const heading = panel.querySelector("[data-calendar-month]");
  const weekdays = panel.querySelector("[data-calendar-weekdays]");
  const grid = panel.querySelector("[data-calendar-days]");
  const agendaHeading = panel.querySelector("[data-agenda-heading]");
  const agendaList = panel.querySelector("[data-agenda-list]");
  const scheduleLink = panel.querySelector("[data-open-schedule]");

  const { weekStart } = readPreferences();
  const todayKey = scheduleDateKey(today);
  const currentMonth = firstOfMonth(today);

  let selected = today;
  let month = currentMonth;

  for (const weekday of calendarWeekdayLabels(weekStart)) {
    const label = document.createElement("span");
    label.textContent = weekday.slice(0, 2);
    weekdays.append(label);
  }

  function showAgenda() {
    const dateLabel = dayFormat.format(selected);
    const isToday = scheduleDateKey(selected) === todayKey;

    agendaHeading.textContent = isToday ? "Today’s agenda" : dateLabel;
    scheduleLink.href = scheduleDateHref(selected);
    scheduleLink.setAttribute("aria-label", `Open ${dateLabel} in Schedule`);

    const events = readDay(selected);

    if (!events) {
      showHomeRows(agendaList, [], "Couldn’t load events.");
      return;
    }

    const rows = events
      .sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"))
      .map(({ title, time }) => ({ title, detail: time || "No time set" }));

    showHomeRows(agendaList, rows, "No events for this day.");
  }

  function showMonth() {
    heading.textContent = monthFormat.format(month);
    grid.replaceChildren();

    const offset = calendarWeekdayOffset(month, weekStart);
    const selectedKey = scheduleDateKey(selected);

    for (let index = 0; index < offset; index += 1) {
      const blank = document.createElement("span");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
    }

    for (const date of datesInMonth(month)) {
      const key = scheduleDateKey(date);
      const count = readDay(date)?.length ?? 0;
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = String(date.getDate());
      button.toggleAttribute("data-has-events", count > 0);
      button.setAttribute("aria-pressed", String(key === selectedKey));

      const eventsLabel = count ? `, ${count} ${count === 1 ? "event" : "events"}` : "";
      button.setAttribute("aria-label", `${dayFormat.format(date)}${eventsLabel}`);

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
      selected = scheduleDateKey(month) === scheduleDateKey(currentMonth) ? today : month;
      showMonth();
      showAgenda();
    });
  }

  showMonth();
  showAgenda();
}