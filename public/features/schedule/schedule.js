import { openScheduleDialog } from "./schedule-dialog.js";
import { readPreferences } from "../../services/preferences.js";
import { datesInMonth, firstOfMonth } from "../../services/calendar-month.js";
import {
  calendarWeekdayLabels,
  calendarWeekdayOffset,
  parseScheduleDate,
  readScheduleEvents,
  scheduleDateKey,
  shiftCalendarDays,
} from "../../services/schedule-events.js";

const monthFormat = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});

const fullDateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "full" });
const shortDateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

export function renderSchedule(container, requestedDate = null) {
  const screen = document.createElement("section");
  screen.className = "schedule-screen";

  screen.innerHTML = `
    <div class="schedule-page-heading">
      <h1>Schedule</h1>
      <button class="schedule-primary" type="button" data-add-event
        aria-haspopup="dialog">+ Add event</button>
    </div>

    <div class="schedule-layout">
      <section class="schedule-calendar" aria-labelledby="schedule-period">
        <div class="schedule-toolbar">
          <h2 id="schedule-period" aria-live="polite"></h2>
          <div class="schedule-actions">
            <button type="button" data-step="-1">‹</button>
            <button type="button" data-today>Today</button>
            <button type="button" data-step="1">›</button>
          </div>
        </div>

        <div class="schedule-toolbar">
          <label>Go to month <input type="month" data-month></label>
          <div class="schedule-actions" role="group" aria-label="Calendar view">
            <button type="button" data-view="month">Month</button>
            <button type="button" data-view="week">Week</button>
          </div>
        </div>

        <div class="schedule-grid" data-weekdays aria-hidden="true"></div>
        <div class="schedule-grid" data-days></div>
      </section>

      <section class="schedule-agenda" aria-label="Today’s agenda">
        <h2>Today’s agenda</h2>
        <p data-agenda-date></p>
        <p data-agenda-status role="status"></p>
        <ul class="schedule-agenda-list" data-agenda-list></ul>
        <button type="button" data-today-agenda aria-haspopup="dialog">
          Manage today’s events
        </button>
      </section>
    </div>

    <p class="schedule-feedback" role="status"></p>
  `;

  const heading = screen.querySelector("#schedule-period");
  const grid = screen.querySelector("[data-days]");
  const weekdays = screen.querySelector("[data-weekdays]");
  const monthInput = screen.querySelector("[data-month]");
  const add = screen.querySelector("[data-add-event]");
  const todayAgenda = screen.querySelector("[data-today-agenda]");
  const feedback = screen.querySelector(".schedule-feedback");
  const viewButtons = screen.querySelectorAll("[data-view]");
  const stepButtons = screen.querySelectorAll("[data-step]");

  const { weekStart } = readPreferences();
  const dateButtons = new Map();
  const linkedDate = parseScheduleDate(requestedDate);

  let activeDate = linkedDate ?? new Date();
  let view = "week";

  for (const day of calendarWeekdayLabels(weekStart)) {
    const label = document.createElement("span");
    label.className = "schedule-weekday";
    label.textContent = day;
    weekdays.append(label);
  }

  function sortEvents(date) {
    return readScheduleEvents(date).sort((a, b) =>
      (a.time || "24:00").localeCompare(b.time || "24:00"),
    );
  }

  function showAgenda() {
    const today = new Date();
    const status = screen.querySelector("[data-agenda-status]");
    const list = screen.querySelector("[data-agenda-list]");
    screen.querySelector("[data-agenda-date]").textContent = fullDateFormat.format(today);
    list.replaceChildren();

    try {
      const events = sortEvents(today);
      status.textContent = events.length ? "" : "No events scheduled for today.";

      for (const event of events) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        const time = document.createElement("span");
        title.textContent = event.title;
        time.textContent = event.time || "No time set";
        item.append(title, time);
        list.append(item);
      }
    } catch (error) {
      console.error("Could not load today’s agenda.", error);
      status.textContent = "Couldn’t load today’s events.";
    }
  }

  function updateDayLabel(button, date) {
    let events = [];

    try {
      events = sortEvents(date);
    } catch (error) {
      console.error("Could not read events for calendar date.", error);
    }

    const count = events.length;
    const label = count === 1 ? "event" : "events";
    button.setAttribute("aria-label", `${fullDateFormat.format(date)}, ${count} ${label}`);
    button.classList.toggle("has-events", count > 0);

    const badge = button.querySelector(".schedule-event-count");
    badge.hidden = count === 0;
    badge.textContent = String(count);

    const preview = button.querySelector(".schedule-day-preview");

    if (preview) {
      preview.replaceChildren();

      for (const event of events.slice(0, 2)) {
        const entry = document.createElement("span");
        entry.textContent = event.title;
        preview.append(entry);
      }
    }
  }

  function handleEventChange(date, _count, revealDate) {
    if (revealDate) {
      activeDate = date;
      showCalendar();
      feedback.textContent = `Event added for ${shortDateFormat.format(date)}.`;
      return;
    }

    const button = dateButtons.get(scheduleDateKey(date));
    if (button) updateDayLabel(button, date);
    showAgenda();
  }

  function openDay(date, trigger, fromRoute = false) {
    activeDate = date;

    openScheduleDialog({
      date,
      trigger,
      onChange: handleEventChange,
      fromRoute,
    });
  }

  function addDay(date, todayKey) {
    const key = scheduleDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "schedule-day";
    button.textContent = String(date.getDate());
    button.setAttribute("aria-haspopup", "dialog");

    if (key === todayKey) button.setAttribute("aria-current", "date");

    const badge = document.createElement("span");
    badge.className = "schedule-event-count";
    badge.setAttribute("aria-hidden", "true");
    button.append(badge);

    if (view === "week") {
      const preview = document.createElement("span");
      preview.className = "schedule-day-preview";
      preview.setAttribute("aria-hidden", "true");
      button.append(preview);
    }

    updateDayLabel(button, date);
    button.addEventListener("click", () => openDay(date, button));
    dateButtons.set(key, button);
    grid.append(button);
  }

  function showCalendar() {
    const todayKey = scheduleDateKey(new Date());
    const month = firstOfMonth(activeDate);

    showAgenda();
    grid.dataset.view = view;
    monthInput.value = scheduleDateKey(month).slice(0, 7);
    grid.replaceChildren();
    dateButtons.clear();

    for (const button of viewButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.view === view));
    }

    for (const button of stepButtons) {
      const direction = button.dataset.step === "-1" ? "Previous" : "Next";
      button.setAttribute("aria-label", `${direction} ${view}`);
    }

    if (view === "week") {
      const offset = calendarWeekdayOffset(activeDate, weekStart);
      const first = shiftCalendarDays(activeDate, -offset);
      const last = shiftCalendarDays(first, 6);

      heading.textContent = `${shortDateFormat.format(first)} – ${shortDateFormat.format(last)}`;

      for (let day = 0; day < 7; day += 1) {
        addDay(shiftCalendarDays(first, day), todayKey);
      }

      return;
    }

    heading.textContent = monthFormat.format(month);
    const leadingDays = calendarWeekdayOffset(month, weekStart);

    for (let offset = 0; offset < leadingDays; offset += 1) {
      const blank = document.createElement("span");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
    }

    for (const date of datesInMonth(month)) {
      addDay(date, todayKey);
    }
  }

  for (const button of stepButtons) {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.step);

      activeDate = view === "week"
        ? shiftCalendarDays(activeDate, step * 7)
        : firstOfMonth(activeDate, step);

      showCalendar();
    });
  }

  for (const button of viewButtons) {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      showCalendar();
    });
  }

  monthInput.addEventListener("change", () => {
    const selected = parseScheduleDate(`${monthInput.value}-01`);
    if (selected) activeDate = selected;
    showCalendar();
  });

  screen.querySelector("[data-today]").addEventListener("click", () => {
    activeDate = new Date();
    showCalendar();
    dateButtons.get(scheduleDateKey(activeDate))?.focus();
  });

  todayAgenda.addEventListener("click", () => {
    openScheduleDialog({
      date: new Date(),
      trigger: todayAgenda,
      onChange: handleEventChange,
    });
  });

  add.addEventListener("click", () => {
    openScheduleDialog({
      date: activeDate,
      trigger: add,
      onChange: handleEventChange,
      chooseDate: true,
    });
  });

  container.replaceChildren(screen);
  showCalendar();

  if (linkedDate) {
    openDay(linkedDate, dateButtons.get(scheduleDateKey(linkedDate)), true);
  } else if (requestedDate !== null) {
    feedback.textContent = "Invalid date link. Showing the current week.";
  }
}