import { openProfile } from "./profile.js";
import { openSearch } from "./search-dialog.js";
import { openReminders } from "./reminders-dialog.js";
import { getExperience } from "../services/experience.js";
import { readPreferences } from "../services/preferences.js";
import { getProfileIcon } from "../services/study-goals.js";
import { readStudyReminders } from "../services/study-reminders.js";

const headerListeners = new WeakMap();

function createIcon(path, className) {
  const icon = document.createElement("img");
  icon.className = className;
  icon.alt = "";
  icon.addEventListener("error", () => icon.remove(), { once: true });
  icon.src = new URL(`../assets/icons/${path}`, import.meta.url).href;
  return icon;
}

function isEditable(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    Boolean(target.closest("input, textarea, select, [role='textbox']"))
  );
}

export function renderHeader(container) {
  headerListeners.get(container)?.abort();

  const controller = new AbortController();
  headerListeners.set(container, controller);
  const options = { signal: controller.signal };

  const search = document.createElement("button");
  search.type = "button";
  search.className = "header-search workspace-search-trigger";
  search.setAttribute("aria-haspopup", "dialog");
  search.setAttribute("aria-keyshortcuts", "/");

  const label = document.createElement("span");
  label.className = "header-search-label";
  label.textContent = "Search courses, tasks, quizzes, and resources…";

  const shortcut = document.createElement("kbd");
  shortcut.className = "header-search-shortcut";
  shortcut.textContent = "/";
  shortcut.setAttribute("aria-hidden", "true");

  search.append(createIcon("navigation/search.svg", "header-search-icon"), label, shortcut);
  search.addEventListener("click", () => openSearch(search));

  const actions = document.createElement("div");
  actions.className = "header-actions";

  const reminders = document.createElement("button");
  reminders.type = "button";
  reminders.className = "header-reminders-trigger";
  reminders.setAttribute("aria-haspopup", "dialog");

  const reminderLabel = document.createElement("span");
  reminderLabel.textContent = "Reminders";

  const reminderCount = document.createElement("span");
  reminderCount.className = "header-reminder-count";
  reminderCount.setAttribute("aria-hidden", "true");

  reminders.append(reminderLabel, reminderCount);

  function refreshReminders() {
    const settings = readPreferences();
    reminders.hidden = !settings.taskReminders && !settings.eventReminders;
    if (reminders.hidden) return;

    const count = readStudyReminders(settings).reduce(
      (total, section) => total + section.rows.length, 0,
    );

    reminderCount.textContent = String(count);
    reminders.setAttribute(
      "aria-label",
      `Open reminders, ${count} ${count === 1 ? "item" : "items"}`,
    );
  }

  reminders.addEventListener("click", () => {
    refreshReminders();
    openReminders(reminders);
  });

  const profile = document.createElement("button");
  profile.type = "button";
  profile.className = "header-profile workspace-profile-trigger";
  profile.setAttribute("aria-label", "Open scholar profile");
  profile.setAttribute("aria-haspopup", "dialog");

  const profileImage = document.createElement("img");
  profileImage.className = "header-scholar-icon";
  profileImage.alt = "";

  const fallbackIcon = getProfileIcon().url;

  profileImage.addEventListener("error", () => {
    if (profileImage.src !== fallbackIcon) profileImage.src = fallbackIcon;
  });

  const levelBadge = document.createElement("span");
  levelBadge.className = "header-level";
  levelBadge.textContent = "Profile";
  profile.append(profileImage, levelBadge);

  function refreshProfileIcon() {
    const { url } = getProfileIcon(readPreferences().badge);
    if (profileImage.src !== url) profileImage.src = url;
  }

  let latestRequest = 0;

  async function refreshLevel() {
    const request = ++latestRequest;

    try {
      const { level, rankName } = await getExperience();
      if (request !== latestRequest || controller.signal.aborted) return;

      levelBadge.textContent = `LVL ${String(level).padStart(2, "0")}`;
      profile.setAttribute(
        "aria-label",
        rankName
          ? `Open scholar profile, ${rankName}, level ${level}`
          : `Open scholar profile, level ${level}`,
      );
    } catch (error) {
      console.error("Could not load your level.", error);
    }
  }

  profile.addEventListener("click", () => {
    refreshLevel();
    openProfile(profile);
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key !== "/" || event.defaultPrevented || event.repeat ||
      event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
      !search.isConnected || isEditable(event.target) ||
      document.querySelector("dialog:modal")
    ) {
      return;
    }

    event.preventDefault();
    openSearch(search);
  }, options);

  actions.append(reminders, profile);
  container.replaceChildren(search, actions);

  function refreshHeaderPreferences() {
    refreshProfileIcon();
    refreshReminders();
  }

  window.addEventListener("hashchange", refreshReminders, options);
  window.addEventListener("hashchange", refreshLevel, options);
  window.addEventListener("focus", refreshHeaderPreferences, options);
  window.addEventListener("focus", refreshLevel, options);
  window.addEventListener("storage", refreshHeaderPreferences, options);
  window.addEventListener("storage", refreshLevel, options);
  window.addEventListener(
    "pandora:preferences-changed",
    refreshHeaderPreferences,
    options,
  );
  window.addEventListener("pandora:task-completed", refreshLevel, options);
  window.addEventListener("pandora:quiz-completed", refreshLevel, options);

  const timer = window.setInterval(refreshReminders, 15_000);
  controller.signal.addEventListener("abort", () => window.clearInterval(timer), {
    once: true,
  });

  refreshHeaderPreferences();
  refreshLevel();
}