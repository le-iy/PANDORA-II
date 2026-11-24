const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function scheduleDateKey(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseScheduleDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) || scheduleDateKey(date) !== value
    ? null
    : date;
}

export function shiftCalendarDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

export function calendarWeekdayOffset(date, weekStart) {
  const firstDay = weekStart === "monday" ? 1 : 0;
  return (date.getDay() - firstDay + 7) % 7;
}

export function calendarWeekdayLabels(weekStart) {
  return weekStart === "monday"
    ? [...weekdayLabels.slice(1), weekdayLabels[0]]
    : [...weekdayLabels];
}

function storageKey(date) {
  return `pandora-ii.schedule.${scheduleDateKey(date)}`;
}

export function readScheduleEvents(date) {
  const saved = JSON.parse(localStorage.getItem(storageKey(date)) ?? "[]");

  if (!Array.isArray(saved)) throw new Error("Invalid saved events.");

  return saved
    .filter((event) => typeof event?.title === "string")
    .map((event) => ({
      ...event,
      time: typeof event.time === "string" ? event.time : "",
    }));
}

export function writeScheduleEvents(date, events) {
  localStorage.setItem(storageKey(date), JSON.stringify(events));
}