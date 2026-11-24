import { getProfileIcons, goalLimits } from "./study-goals.js";
import { activeThemePack, themePacks } from "./theme-packs.js";

const storageKey = "pandora-ii.settings";

export const defaultPreferences = Object.freeze({
  displayName: "Student",
  themePack: "pixel",
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
  motion: new Set(["system", "reduced"]),
  weekStart: new Set(["sunday", "monday"]),
};

const colorModes = new Set(["system", "light", "dark"]);

function normalizeAppearance(value, pack) {
  const { accents, defaultAccent, defaultBadge } = themePacks[pack];
  return {
    theme: colorModes.has(value?.theme) ? value.theme : "system",
    accent: Object.hasOwn(accents, value?.accent) ? value.accent : defaultAccent,
    badge: Object.hasOwn(getProfileIcons(pack), value?.badge) ? value.badge : defaultBadge,
  };
}

function normalizePreferences(value) {
  const themePack = Object.hasOwn(themePacks, value?.themePack) ? value.themePack : "pixel";
  const appearances = Object.fromEntries(Object.keys(themePacks).map((pack) => [
    pack,
    normalizeAppearance(
      pack === themePack && (value?.theme !== undefined ||
        value?.accent !== undefined || value?.badge !== undefined)
        ? value
        : value?.appearances?.[pack],
      pack,
    ),
  ]));
  const displayName = typeof value?.displayName === "string"
    ? value.displayName.trim()
    : "";

  const settings = {
    displayName: displayName || defaultPreferences.displayName,
    themePack,
    appearances,
    ...appearances[themePack],
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
    return normalizePreferences(defaultPreferences);
  }
}

export function applyPreferences(settings = readPreferences()) {
  const root = document.documentElement;
  root.dataset.themePack = settings.themePack;
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.motion = settings.motion;
}

export function savePreferences(values) {
  const previousPack = activeThemePack();
  const settings = normalizePreferences(values);

  localStorage.setItem(storageKey, JSON.stringify(settings));
  applyPreferences(settings);

  window.dispatchEvent(new Event("pandora:preferences-changed"));
  if (settings.themePack !== previousPack) {
    window.dispatchEvent(new Event("pandora:theme-pack-changed"));
  }

  return settings;
}