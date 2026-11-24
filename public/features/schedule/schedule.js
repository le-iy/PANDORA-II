import { openScheduleDialog } from "./schedule-dialog.js";
import { readPreferences } from "../../services/preferences.js";
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

const shortDateFormat = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function renderSchedule(container) {
  const screen = document.createElement("section");
  screen.className = "schedule-screen";

  screen.innerHTML = `
    <div class="schedule-page-heading">
      <h1>Schedule</h1>
      <button class="schedule-primary" type="button" data-add-event
        aria-haspopup="dialog">+ Add event</button>
    </div>

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
        <label>
          Go to month
          <input type="month" data-month>
        </label>

        <div class="schedule-actions" role="group" aria-label="Calendar view">
          <button type="button" data-view="month">Month</button>
          <button type="button" data-view="week">Week</button>
        </div>

        <button type="button" data-today-agenda aria-haspopup="dialog">
          Today’s agenda
        </button>
      </div>

      <div class="schedule-grid" data-weekdays aria-hidden="true"></div>
      <div class="schedule-grid" data-days></div>
    </section>

    <p class="schedule-feedback" role="status"></p>
  `;

  const heading = screen.querySelector("h2");
  const grid = screen.querySelector("[data-days]");
  const weekdayRow = screen.querySelector("[data-weekdays]");
  const monthInput = screen.querySelector("[data-month]");
  const addButton = screen.querySelector("[data-add-event]");
  const todayAgendaButton = screen.querySelector("[data-today-agenda]");
  const feedback = screen.querySelector('[role="status"]');
  const viewButtons = screen.querySelectorAll("[data-view]");
  const stepButtons = screen.querySelectorAll("[data-step]");

  const { weekStart } = readPreferences();
  const dateButtons = new Map();
  let activeDate = new Date();
  let view = "month";

  for (const day of calendarWeekdayLabels(weekStart)) {
    const label = document.createElement("span");
    label.className = "schedule-weekday";
    label.textContent = day;
    weekdayRow.append(label);
  }

  function updateDayLabel(button, date, count) {
    const label = count === 1 ? "event" : "events";

    button.setAttribute(
      "aria-label",
      `${fullDateFormat.format(date)}, ${count} ${label}`,
    );
    button.classList.toggle("has-events", count > 0);

    const badge = button.querySelector(".schedule-event-count");
    badge.hidden = count === 0;
    badge.textContent = String(count);
  }

  function handleEventChange(date, count, revealDate) {
    if (revealDate) {
      activeDate = date;
      showCalendar();
      feedback.textContent = `Event added for ${shortDateFormat.format(date)}.`;
      return;
    }

    const button = dateButtons.get(scheduleDateKey(date));
    if (button) updateDayLabel(button, date, count);
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

    let count = 0;

    try {
      count = readScheduleEvents(date).length;
    } catch (error) {
      console.error("Could not read events for calendar date.", error);
    }

    updateDayLabel(button, date, count);

    button.addEventListener("click", () => {
      activeDate = date;
      openScheduleDialog({
        date,
        trigger: button,
        onChange: handleEventChange,
      });
    });

    dateButtons.set(key, button);
    grid.append(button);
  }

  function showCalendar() {
    const todayKey = scheduleDateKey(new Date());
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();
    const monthStart = new Date(year, month, 1);

    monthInput.value = scheduleDateKey(monthStart).slice(0, 7);
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

      heading.textContent =
        `${shortDateFormat.format(first)} – ${shortDateFormat.format(last)}`;

      for (let day = 0; day < 7; day += 1) {
        addDay(shiftCalendarDays(first, day), todayKey);
      }

      return;
    }

    heading.textContent = monthFormat.format(monthStart);

    const leadingDays = calendarWeekdayOffset(monthStart, weekStart);

    for (let offset = 0; offset < leadingDays; offset += 1) {
      const blank = document.createElement("span");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
    }

    const dayCount = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= dayCount; day += 1) {
      addDay(new Date(year, month, day), todayKey);
    }
  }

  for (const button of stepButtons) {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.step);

      activeDate = view === "week"
        ? shiftCalendarDays(activeDate, step * 7)
        : new Date(activeDate.getFullYear(), activeDate.getMonth() + step, 1);

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

  todayAgendaButton.addEventListener("click", () => {
    openScheduleDialog({
      date: new Date(),
      trigger: todayAgendaButton,
      onChange: handleEventChange,
    });
  });

  addButton.addEventListener("click", () => {
    openScheduleDialog({
      date: activeDate,
      trigger: addButton,
      onChange: handleEventChange,
      chooseDate: true,
    });
  });

  container.replaceChildren(screen);
  showCalendar();
}