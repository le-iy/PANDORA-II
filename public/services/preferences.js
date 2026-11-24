import { goalLimits, scholarBadges } from "./study-goals.js";

const storageKey = "pandora-ii.settings";

export const defaultPreferences = Object.freeze({
  displayName: "Student",
  theme: "system",
  accent: "lavender",
  motion: "system",
  weekStart: "sunday",
  badge: "scholar",
  dailyTaskGoal: 3,
  dailyExpGoal: 100,
  taskReminders: false,
  eventReminders: false,
});

const choices = {
  theme: new Set(["system", "light", "dark"]),
  accent: new Set(["lavender", "rose", "sage"]),
  motion: new Set(["system", "reduced"]),
  weekStart: new Set(["sunday", "monday"]),
  badge: new Set(Object.keys(scholarBadges)),
};

function normalizePreferences(value) {
  const displayName = typeof value?.displayName === "string"
    ? value.displayName.trim()
    : "";

  const settings = {
    displayName: displayName || defaultPreferences.displayName,
    taskReminders: value?.taskReminders === true || value?.taskReminders === "on",
    eventReminders: value?.eventReminders === true || value?.eventReminders === "on",
  };

  for (const [key, options] of Object.entries(choices)) {
    settings[key] = options.has(value?.[key]) ? value[key] : defaultPreferences[key];
  }

  for (const [key, { min, max }] of Object.entries(goalLimits)) {
    const amount = Number(value?.[key]);

    settings[key] = Number.isInteger(amount) && amount >= min && amount <= max
      ? amount
      : defaultPreferences[key];
  }

  return settings;
}

export function readPreferences() {
  try {
    return normalizePreferences(JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
  } catch (error) {
    console.error("Could not load preferences.", error);
    return { ...defaultPreferences };
  }
}

export function applyPreferences(settings = readPreferences()) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.motion = settings.motion;
}

export function savePreferences(values) {
  const settings = normalizePreferences(values);

  localStorage.setItem(storageKey, JSON.stringify(settings));
  applyPreferences(settings);

  window.dispatchEvent(new Event("pandora:preferences-changed"));

  return settings;
}