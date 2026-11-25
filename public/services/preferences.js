import { isUploadedWallpaper, readWallpaper } from "./wallpaper-storage.js";
import backgroundFiles from "../assets/backgrounds/custom/index.js";
import { builtInIconPacks } from "./theme-packs.js";
import { globalIcons } from "./theme-packs.js";
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
    badge: !String(value?.badge ?? "").startsWith("global-icons/") && Object.hasOwn(getProfileIcons(pack), value?.badge) ? value.badge : defaultBadge,
  };
}

export const customBackgrounds = Object.freeze([...backgroundFiles]);

export const customPaletteFields = Object.freeze({ background: "Background", surface: "Main panels", "surface-muted": "Highlights", text: "Text", primary: "Accent", border: "Borders" });
const customHex = /^#[0-9a-f]{6}$/i;
const systemDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)");

export function customPaletteMode(mode) {
  return mode === "dark" || (mode === "system" && systemDark?.matches) ? "dark" : "light";
}

function cleanPalette(value) {
  return Object.fromEntries(Object.keys(customPaletteFields).flatMap(key => {
    const color = value?.[key];
    return typeof color === "string" && customHex.test(color) ? [[key, color]] : [];
  }));
}

export function applyCustomPalette(element, palette) {
  const colors = cleanPalette(palette);
  for (const key of [...Object.keys(customPaletteFields), "primary-text"]) element.style.removeProperty("--color-" + key);
  for (const [key, color] of Object.entries(colors)) element.style.setProperty("--color-" + key, color);
  if (colors.primary) {
    const [r, g, b] = colors.primary.slice(1).match(/../g).map(hex => {
      const channel = parseInt(hex, 16) / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    element.style.setProperty("--color-primary-text", .2126 * r + .7152 * g + .0722 * b > .179 ? "#000000" : "#ffffff");
  }
}

systemDark?.addEventListener("change", () => {
  const root = globalThis.document?.documentElement;
  if (root?.dataset.themePack === "custom" && root.dataset.theme === "system") applyPreferences();
});

function normalizePreferences(value) {
  const themePack = Object.hasOwn(themePacks, value?.themePack) ? value.themePack : "pixel";
  const appearances = Object.fromEntries(Object.keys(themePacks).map((pack) => [
    pack,
    normalizeAppearance(
      pack === themePack && (value?.theme !== undefined ||
        value?.accent !== undefined || value?.badge !== undefined)
        ? { ...value, badge: String(value?.badge ?? "").startsWith("global-icons/") ? value?.appearances?.[pack]?.badge : value.badge }
        : value?.appearances?.[pack],
      pack,
    ),
  ]));
  const displayName = typeof value?.displayName === "string"
    ? value.displayName.trim()
    : "";

  const globalBadge = Object.hasOwn(globalIcons, value?.globalBadge) ? value.globalBadge : "";
  const settings = {
    displayName: displayName || defaultPreferences.displayName,
    themePack,
    customCorners: value?.customCorners === "square" ? "square" : "rounded",
    customSpacing: value?.customSpacing === "compact" ? "compact" : "comfortable",
    customBackground: (customBackgrounds.includes(value?.customBackground) || isUploadedWallpaper(value?.customBackground)) ? value.customBackground : "",
    customPalettes: { light: cleanPalette(value?.customPalettes?.light), dark: cleanPalette(value?.customPalettes?.dark) },
    customBase: builtInIconPacks.includes(value?.customBase) ? value.customBase : "pixel",
    appearances,
    ...appearances[themePack],
    globalBadge,
    badge: globalBadge || appearances[themePack].badge,
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

let wallpaperSelection;
let workspaceWallpaperUrl;

export function bundledWallpaperUrl(file) {
  return customBackgrounds.includes(file) ? new URL("../assets/backgrounds/custom/" + encodeURIComponent(file), import.meta.url).href : "";
}

function applyWorkspaceWallpaper(root, file) {
  if (wallpaperSelection?.file === file) return;
  const selection = { file };
  wallpaperSelection = selection;
  if (workspaceWallpaperUrl) URL.revokeObjectURL(workspaceWallpaperUrl);
  workspaceWallpaperUrl = undefined;
  root.style.removeProperty("--custom-workspace-image");
  const setImage = url => root.style.setProperty("--custom-workspace-image", "url(" + JSON.stringify(url) + ")");
  const bundled = bundledWallpaperUrl(file);
  if (bundled) setImage(bundled);
  else if (isUploadedWallpaper(file)) {
    readWallpaper(file).then(wallpaper => {
      if (wallpaperSelection !== selection || !wallpaper) return;
      workspaceWallpaperUrl = URL.createObjectURL(wallpaper.image);
      setImage(workspaceWallpaperUrl);
    }).catch(error => {
      if (wallpaperSelection === selection) wallpaperSelection = undefined;
      console.error("Could not load wallpaper.", error);
    });
  }
}

export function applyPreferences(settings = readPreferences()) {
  const root = document.documentElement;
  root.dataset.themePack = settings.themePack;
  root.dataset.customBase = settings.customBase;
  root.dataset.customCorners = settings.customCorners ?? "rounded";
  root.dataset.customSpacing = settings.customSpacing ?? "comfortable";
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.motion = settings.motion;
  applyWorkspaceWallpaper(root, settings.themePack === "custom" ? settings.customBackground : "");
  applyCustomPalette(root, settings.themePack === "custom" ? settings.customPalettes?.[customPaletteMode(settings.theme)] : null);
}

export function savePreferences(values) {
  const previousPack = activeThemePack();
  const previousBase = document.documentElement.dataset.customBase;
  const settings = normalizePreferences(values);

  localStorage.setItem(storageKey, JSON.stringify(settings));
  applyPreferences(settings);

  window.dispatchEvent(new Event("pandora:preferences-changed"));
  if (settings.themePack !== previousPack || (settings.themePack === "custom" && settings.customBase !== previousBase)) {
    window.dispatchEvent(new Event("pandora:theme-pack-changed"));
  }

  return settings;
}