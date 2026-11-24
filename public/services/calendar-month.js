import { scheduleDateKey } from "./schedule-events.js";

export function firstOfMonth(date, offset = 0) {
  const first = new Date(date);
  first.setDate(1);
  first.setMonth(first.getMonth() + offset);
  first.setHours(0, 0, 0, 0);
  return first;
}

export function datesInMonth(date) {
  const first = firstOfMonth(date);
  const last = firstOfMonth(date, 1);
  last.setDate(0);

  return Array.from({ length: last.getDate() }, (_, index) => {
    const day = new Date(first);
    day.setDate(index + 1);
    return day;
  });
}

export function scheduleDateHref(date) {
  return `#/schedule/${scheduleDateKey(date)}`;
}