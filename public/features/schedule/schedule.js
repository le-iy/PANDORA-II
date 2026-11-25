import { decorateScheduleEvent, openScheduleDialog } from "./schedule-dialog.js";
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
import { readTasks } from "../../services/task-store.js";

const timetableCss = new URL("../../styles/schedule-timetable.css", import.meta.url);
const monthFormat = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });
const fullDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "full" });
const clock = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
});

function loadTimetableStyles() {
  if (document.head.querySelector("[data-timetable-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = timetableCss.href;
  link.dataset.timetableStyles = "";
  document.head.append(link);
}

function minutesFromTime(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  return clock.format(new Date(2000, 0, 1, 0, minutes));
}

function sortedEvents(date) {
  try {
    return readScheduleEvents(date).map((event, index) => ({ ...event, calendarEventIndex: index })).sort(
      (a, b) =>
        (minutesFromTime(a.time) ?? 1440) -
        (minutesFromTime(b.time) ?? 1440),
    );
  } catch (error) {
    console.error("Could not read schedule events.", error);
    return null;
  }
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function button(className, label, action) {
  const control = element("button", className, label);
  control.type = "button";
  control.addEventListener("click", action);
  return control;
}

function fillList(list, entries, message) {
  list.replaceChildren();

  if (!entries.length) {
    list.append(element("li", "", message));
    return;
  }

  for (const { title, detail, event } of entries) {
    const item = element("li");
    const heading = element("strong", "", title);
    if (event) decorateScheduleEvent(item, event, heading);
    item.append(heading, element("span", "", detail));
    list.append(item);
  }
}

export function renderSchedule(container, requestedDate = null) {
  loadTimetableStyles();

  const screen = element("section", "schedule-screen schedule-timetable-screen");
  screen.innerHTML = `
    <header class="schedule-page-heading">
      <h1>Schedule</h1>
      <button class="schedule-primary" type="button" data-add-event
        aria-haspopup="dialog">+ Add event</button>
    </header>

    <div class="schedule-toolbar schedule-period-bar">
      <div>
        <h2 id="schedule-period" aria-live="polite"></h2>
        <label>Go to month <input type="month" data-month></label>
      </div>
      <div class="schedule-actions">
        <button type="button" data-step="-1">‹</button>
        <button type="button" data-today>Today</button>
        <button type="button" data-step="1">›</button>
      </div>
      <div class="schedule-actions" role="group" aria-label="Calendar view">
        <button type="button" data-view="week">Week</button>
        <button type="button" data-view="month">Month</button>
      </div>
    </div>

    <div class="schedule-layout schedule-timetable-layout">
      <section class="schedule-calendar" aria-labelledby="schedule-period">
        <div data-calendar></div>
      </section>

      <aside class="schedule-side-panels" aria-label="Schedule overview">
        <section class="schedule-agenda">
          <h2>Today’s agenda</h2>
          <p data-agenda-date></p>
          <ul class="schedule-agenda-list" data-agenda-list></ul>
          <button type="button" data-today-agenda aria-haspopup="dialog">
            Manage today’s events
          </button>
        </section>

        <section class="schedule-agenda schedule-deadlines">
          <h2>Upcoming deadlines</h2>
          <ul class="schedule-agenda-list" data-deadlines></ul>
          <a href="#/tasks">View all tasks</a>
        </section>
      </aside>
    </div>

    <p class="schedule-feedback" role="status"></p>
  `;

  const period = screen.querySelector("#schedule-period");
  const calendar = screen.querySelector("[data-calendar]");
  const month = screen.querySelector("[data-month]");
  const add = screen.querySelector("[data-add-event]");
  const agenda = screen.querySelector("[data-today-agenda]");
  const feedback = screen.querySelector(".schedule-feedback");
  const viewButtons = screen.querySelectorAll("[data-view]");
  const stepButtons = screen.querySelectorAll("[data-step]");
  const { weekStart } = readPreferences();
  const linkedDate = parseScheduleDate(requestedDate);
  const dayButtons = new Map();

  let activeDate = linkedDate ?? new Date();
  let view = "week";
  let openedDay = null;
  let refreshOnClose = false;

  function showSidePanels() {
    const today = new Date();
    const todayKey = scheduleDateKey(today);
    const events = sortedEvents(today);

    screen.querySelector("[data-agenda-date]").textContent = fullDate.format(today);
    fillList(
      screen.querySelector("[data-agenda-list]"),
      (events ?? []).map((event) => {
        const minutes = minutesFromTime(event.time);
        return {
          title: event.title,
          event,
          detail: minutes === null ? "No time set" : formatTime(minutes),
        };
      }),
      events ? "No events scheduled for today." : "Couldn’t load today’s events.",
    );

    const deadlineList = screen.querySelector("[data-deadlines]");

    try {
      const tasks = readTasks()
        .filter((task) => task?.title && !task.completed)
        .map((task) => ({ task, date: parseScheduleDate(task.deadline) }))
        .filter(({ date }) => date && scheduleDateKey(date) >= todayKey)
        .sort((a, b) => a.date - b.date)
        .slice(0, 3);

      fillList(
        deadlineList,
        tasks.map(({ task, date }) => ({
          title: task.title,
          detail: [shortDate.format(date), task.courseCode].filter(Boolean).join(" · "),
        })),
        "No upcoming deadlines.",
      );
    } catch (error) {
      console.error("Could not load upcoming deadlines.", error);
      fillList(deadlineList, [], "Couldn’t load upcoming deadlines.");
    }
  }

  function openDay(date, trigger, options = {}) {
    const { chooseDate = false, fromRoute = false, selectedEventIndex = null } = options;
    openedDay = date;
    refreshOnClose = false;

    openScheduleDialog({
      date,
      trigger,
      chooseDate,
      fromRoute,
      selectedEventIndex,
      onChange(target, _count, revealDate) {
        refreshOnClose = true;
        showSidePanels();

        if (revealDate) {
          activeDate = target;
          feedback.textContent = `Event added for ${shortDate.format(target)}.`;
        }
      },
    });

    const dialog = document.querySelector(".schedule-dialog[open]");

    dialog?.addEventListener("close", () => {
      if (refreshOnClose && screen.isConnected) {
        const restoreDayFocus = calendar.contains(trigger);
        showCalendar();

        if (restoreDayFocus) {
          dayButtons.get(scheduleDateKey(openedDay))?.focus();
        }
      }

      openedDay = null;
    }, { once: true });
  }

  function makeDayButton(date, events, className, label) {
    const key = scheduleDateKey(date);
    const count = events?.length ?? 0;
    const control = button(className, label, () => openDay(date, control));

    control.setAttribute("aria-haspopup", "dialog");
    control.setAttribute(
      "aria-label",
      `${fullDate.format(date)}, ${count} ${count === 1 ? "event" : "events"}`,
    );

    if (key === scheduleDateKey(new Date())) {
      control.setAttribute("aria-current", "date");
    }

    dayButtons.set(key, control);
    return control;
  }

  function makeEventButton(date, event, start) {
    const control = button("schedule-time-event", event.title, () => openDay(date, control, { selectedEventIndex: event.calendarEventIndex }));
    if (event.task) {
      const link = element("a", "schedule-time-event");
      link.href = event.task.id == null ? "#/tasks" : "#/tasks/" + encodeURIComponent(event.task.id);
      link.title = event.title;
      Object.assign(link.style, { color: "var(--color-text)", textDecoration: "none", borderInlineStart: "3px solid var(--color-primary)" });
      link.append(element("strong", "", event.title), element("span", "schedule-time-label", formatTime(start) + (event.task.completed ? " · Done" : " · Due")));
      return link;
    }
    const label = start === null ? "No time set" : formatTime(start);
    const title = element("strong", "", event.title);
    control.replaceChildren(element("span", "schedule-time-label", label), title);
    decorateScheduleEvent(control, event, title);
    control.setAttribute("aria-haspopup", "dialog");
    return control;
  }

  function readDeadlinesByDate() {
    const byDate = new Map();
    try {
      for (const task of readTasks()) {
        if (typeof task?.title !== "string") continue;
        const date = parseScheduleDate(task.deadline);
        if (!date) continue;
        const key = scheduleDateKey(date);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push(task);
      }
    } catch (error) {
      console.error("Could not load calendar deadlines.", error);
    }
    return byDate;
  }

  function showWeek(deadlines) {
    const first = shiftCalendarDays(activeDate, -calendarWeekdayOffset(activeDate, weekStart));
    const dates = Array.from({ length: 7 }, (_, index) => shiftCalendarDays(first, index));
    const dayEvents = dates.map((date) => {
      const events = sortedEvents(date) ?? [];
      const tasks = (deadlines.get(scheduleDateKey(date)) ?? [])
        .filter(task => minutesFromTime(task.deadlineTime ?? "") !== null)
        .map(task => ({ title: task.title, time: task.deadlineTime, task }));
      return [...events, ...tasks].sort((a, b) => (minutesFromTime(a.time) ?? 1440) - (minutesFromTime(b.time) ?? 1440));
    });
    const labels = calendarWeekdayLabels(weekStart);
    const times = dayEvents.flatMap((events) =>
      (events ?? []).map((event) => minutesFromTime(event.time))
        .filter((time) => time !== null),
    );
    const startHour = Math.min(9, ...times.map((time) => Math.floor(time / 60)));
    const endHour = Math.max(17, ...times.map((time) =>
      Math.ceil(Math.min(1440, time + 60) / 60),
    ));

    period.textContent = `${shortDate.format(first)} – ${shortDate.format(dates[6])}`;

    const heading = element("h3", "schedule-table-title", "Weekly timetable");
    const scroller = element("div", "schedule-time-scroll");
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "Weekly timetable. Scroll to see more days.");

    const table = element("div", "schedule-time-grid");
    const zone = element("div", "schedule-time-corner", "Local time");
    table.append(zone);

    for (const [index, date] of dates.entries()) {
      table.append(makeDayButton(
        date,
        dayEvents[index],
        "schedule-time-day",
        `${labels[index]} ${date.getDate()}`,
      ));
    }

    table.append(element("span", "schedule-time-corner", "Untimed"));

    for (const [index, date] of dates.entries()) {
      const untimed = element("div", "schedule-untimed");
      for (const event of dayEvents[index] ?? []) {
        if (minutesFromTime(event.time) === null) {
          untimed.append(makeEventButton(date, event, null));
        }
      }
      for (const task of deadlines.get(scheduleDateKey(date)) ?? []) {
        if (minutesFromTime(task.deadlineTime ?? "") !== null) continue;
        const link = element("a", "schedule-time-event");
        link.href = task.id == null ? "#/tasks" : "#/tasks/" + encodeURIComponent(task.id);
        link.title = task.title;
        Object.assign(link.style, { color: "var(--color-text)", textDecoration: "none", borderInlineStart: "3px solid var(--color-primary)" });
        link.append(element("strong", "", task.title), element("span", "schedule-time-label", task.completed ? "Due · Done" : "Due"));
        untimed.append(link);
      }
      table.append(untimed);
    }

    const hours = element("div", "schedule-hour-labels");
    for (let hour = startHour; hour < endHour; hour += 1) {
      hours.append(element("span", "", formatTime(hour * 60)));
    }
    table.append(hours);

    for (const [index, date] of dates.entries()) {
      const track = element("div", "schedule-time-track");
      track.style.setProperty("--schedule-hours", endHour - startHour);

      const groups = [];
      for (const event of dayEvents[index] ?? []) {
        const start = minutesFromTime(event.time);
        if (start === null) continue;
        const end = Math.min(1440, start + 60);
        const last = groups.at(-1);
        if (last && start < last.end) {
          last.events.push({ event, start });
          last.end = Math.max(last.end, end);
        } else {
          groups.push({ start, end, events: [{ event, start }] });
        }
      }

      for (const group of groups) {
        const { event, start } = group.events[0];
        const grouped = group.events.length > 1;
        const control = makeEventButton(date, grouped ? { title: `${group.events.length} overlapping events` } : event, start);
        control.title = group.events.map(entry => `${formatTime(entry.start)} · ${entry.event.title}`).join("\u000A");
        if (grouped) control.setAttribute("aria-label", `${group.events.length} overlapping events starting at ${formatTime(start)}. Open day events.`);
        control.style.setProperty("--event-top", (start - startHour * 60) / 60);
        control.style.setProperty("--event-length", Math.min(1, (group.end - start) / 60));
        control.style.setProperty("--event-left", "0%");
        control.style.setProperty("--event-width", "100%");
        track.append(control);
      }

      table.append(track);
    }

    scroller.append(table);
    calendar.replaceChildren(heading, scroller);
  }

  function showMonth(deadlines) {
    const first = firstOfMonth(activeDate);
    const weekdayRow = element("div", "schedule-grid");
    const days = element("div", "schedule-grid");
    period.textContent = monthFormat.format(first);

    for (const label of calendarWeekdayLabels(weekStart)) {
      weekdayRow.append(element("span", "schedule-weekday", label));
    }

    for (let i = 0; i < calendarWeekdayOffset(first, weekStart); i += 1) {
      days.append(element("span"));
    }

    for (const date of datesInMonth(first)) {
      const events = sortedEvents(date);
      const control = makeDayButton(date, events, "schedule-day", date.getDate());

      if (events?.length) {
        control.classList.add("has-events");
        const badge = element("span", "schedule-event-count", events.length);
        badge.setAttribute("aria-hidden", "true");
        control.append(badge);
      }

      const due = deadlines.get(scheduleDateKey(date)) ?? [];
      if (due.length) {
        const badge = element("span", "schedule-event-count", due.length + " due");
        badge.setAttribute("aria-hidden", "true");
        control.append(badge);
        control.setAttribute("aria-label", control.getAttribute("aria-label") + ", " + due.length + (due.length === 1 ? " task due" : " tasks due"));
        control.title = due.map(task => task.title).join(String.fromCharCode(10));
      }
      days.append(control);
    }

    calendar.replaceChildren(weekdayRow, days);
  }

  function showCalendar() {
    dayButtons.clear();
    month.value = scheduleDateKey(firstOfMonth(activeDate)).slice(0, 7);

    for (const control of viewButtons) {
      control.setAttribute("aria-pressed", String(control.dataset.view === view));
    }

    for (const control of stepButtons) {
      const direction = control.dataset.step === "-1" ? "Previous" : "Next";
      control.setAttribute("aria-label", `${direction} ${view}`);
    }

    const deadlines = readDeadlinesByDate();
    if (view === "week") showWeek(deadlines);
    else showMonth(deadlines);
  }

  for (const control of stepButtons) {
    control.addEventListener("click", () => {
      const step = Number(control.dataset.step);
      activeDate = view === "week"
        ? shiftCalendarDays(activeDate, step * 7)
        : firstOfMonth(activeDate, step);
      showCalendar();
    });
  }

  for (const control of viewButtons) {
    control.addEventListener("click", () => {
      view = control.dataset.view;
      showCalendar();
    });
  }

  month.addEventListener("change", () => {
    const selected = parseScheduleDate(`${month.value}-01`);
    if (selected) activeDate = selected;
    showCalendar();
  });

  screen.querySelector("[data-today]").addEventListener("click", () => {
    activeDate = new Date();
    showCalendar();
    showSidePanels();
    dayButtons.get(scheduleDateKey(activeDate))?.focus();
  });

  agenda.addEventListener("click", () => openDay(new Date(), agenda));
  add.addEventListener("click", () => openDay(activeDate, add, { chooseDate: true }));

  container.replaceChildren(screen);
  showCalendar();
  showSidePanels();

  if (linkedDate) {
    openDay(linkedDate, dayButtons.get(scheduleDateKey(linkedDate)), { fromRoute: true });
  } else if (requestedDate !== null) {
    feedback.textContent = "Invalid date link. Showing the current week.";
  }
}