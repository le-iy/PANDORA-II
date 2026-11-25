import {
  applyPreferences,
  defaultPreferences,
  readPreferences,
  savePreferences,
} from "../../services/preferences.js";

import {
  getProfileIcon,
  goalLimits,
  getProfileIcons,
} from "../../services/study-goals.js";

import { themePacks } from "../../services/theme-packs.js";

const backupUrl = new URL("../../backup.html", import.meta.url);
const stylesUrl = new URL("../../styles/settings-dashboard.css", import.meta.url);

const sections = [
  ["profile", "Profile"],
  ["appearance", "Appearance"],
  ["notifications", "Notifications"],
  ["study", "Study preferences"],
  ["backup", "Backup & Restore"],
];

function loadDashboardStyles() {
  if (document.head.querySelector("[data-settings-dashboard-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = stylesUrl.href;
  link.dataset.settingsDashboardStyles = "";
  document.head.append(link);
}

export function applySavedSettings() {
  applyPreferences();
}

export function renderSettings(container) {
  loadDashboardStyles();

  const screen = document.createElement("section");
  screen.className = "settings-screen settings-dashboard settings-preference-screen";
  screen.setAttribute("aria-labelledby", "settings-heading");

  const taskGoal = goalLimits.dailyTaskGoal;
  const expGoal = goalLimits.dailyExpGoal;

  screen.innerHTML = `
    <header class="settings-page-header">
      <h1 id="settings-heading">Settings</h1>
      <button class="settings-action settings-action-primary" type="submit"
        form="settings-preference-form" data-save>Save changes</button>
    </header>

    <p class="settings-feedback" role="status"></p>

    <div class="settings-preference-layout">
      <nav class="settings-preference-nav" aria-label="Preferences">
        <h2>Preferences</h2>
        <div data-settings-links></div>
      </nav>

      <div class="settings-preference-content">
        <form class="settings-form" id="settings-preference-form">
          <div class="settings-preferences">
            <fieldset class="settings-card settings-profile-card" data-section="profile">
              <legend tabindex="-1">Profile</legend>

              <div class="settings-profile-fields">
                <div class="settings-badge-preview">
                  <img width="48" height="48" alt="">
                  <span data-profile-icon-label></span>
                  <button class="settings-action" type="button" data-icon-trigger
                    aria-haspopup="dialog">Change profile icon</button>
                </div>

                <label>
                  Display name
                  <input name="displayName" maxlength="60" required autocomplete="nickname">
                </label>
              </div>
              <input name="badge" type="hidden">
            </fieldset>

            <fieldset class="settings-card" data-section="appearance">
              <legend tabindex="-1">Appearance</legend>

              <label>
                Theme pack
                <select name="themePack">
                  <option value="pixel">Pixel</option>
                  <option value="galaxy">Galaxy</option>
                  <option value="nailong">Nailong</option>
                  <option value="hangyodon">Hangyodon</option>
                </select>
              </label>
              <p>Each pack remembers its appearance when you save changes.</p>

              <label>
                Color mode
                <select name="theme">
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>

              <label>
                Accent color
                <select name="accent"></select>
              </label>

              <label>
                Motion
                <select name="motion">
                  <option value="system">Follow system</option>
                  <option value="reduced">Reduce motion</option>
                </select>
              </label>
            </fieldset>

            <fieldset class="settings-card settings-reminders" data-section="notifications">
              <legend tabindex="-1">Notifications</legend>
              <label>
                <input name="taskReminders" type="checkbox">
                Overdue tasks and tasks due today
              </label>
              <label>
                <input name="eventReminders" type="checkbox">
                Today’s calendar events
              </label>
              <p>Reminders appear in the app header.</p>
            </fieldset>

            <fieldset class="settings-card" data-section="study">
              <legend tabindex="-1">Study preferences</legend>

              <label>
                Daily quest goal (tasks)
                <input name="dailyTaskGoal" type="number"
                  min="${taskGoal.min}" max="${taskGoal.max}" step="1" required>
              </label>

              <label>
                Daily EXP goal
                <input name="dailyExpGoal" type="number"
                  min="${expGoal.min}" max="${expGoal.max}" step="1" required>
              </label>

              <label>
                Schedule week starts on
                <select name="weekStart">
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
              </label>
            </fieldset>

            <section class="settings-card" data-section="backup"
              aria-labelledby="settings-backup-heading">
              <h2 id="settings-backup-heading" tabindex="-1">Backup &amp; Restore</h2>
              <p>Export or restore study data and uploaded PDFs, or export a CSV report.</p>
              <a class="settings-action" data-backup>Open Backup &amp; Restore</a>
            </section>
          </div>

          <div class="settings-actions">
            <button class="settings-action" type="button" data-open-reset
              aria-haspopup="dialog">Restore defaults</button>
          </div>
        </form>
      </div>
    </div>

    <dialog class="settings-reset-dialog" data-icon-dialog
      aria-labelledby="settings-icon-heading">
      <h2 id="settings-icon-heading">Choose a profile icon</h2>

      <form method="dialog">
        <div class="settings-badge-options" data-icon-options
          role="group" aria-label="Profile icons"></div>

        <div class="settings-actions">
          <button class="settings-action" type="submit" value="cancel">Cancel</button>
          <button class="settings-action settings-action-primary"
            type="submit" value="choose">Use icon</button>
        </div>
      </form>
    </dialog>

    <dialog class="settings-reset-dialog" data-reset-dialog
      aria-labelledby="settings-reset-heading"
      aria-describedby="settings-reset-description">
      <h2 id="settings-reset-heading">Restore default settings?</h2>

      <p id="settings-reset-description">
        Load the default preferences. Select Save changes to apply them.
      </p>

      <form class="settings-actions" method="dialog">
        <button class="settings-action" type="submit" value="cancel" autofocus>
          Cancel
        </button>
        <button class="settings-action settings-action-primary"
          type="submit" value="restore">Use defaults</button>
      </form>
    </dialog>
  `;

  const form = screen.querySelector(".settings-form");
  const displayName = form.elements.namedItem("displayName");
  const iconField = form.elements.namedItem("badge");
  const packField = form.elements.namedItem("themePack");
  const modeField = form.elements.namedItem("theme");
  const accentField = form.elements.namedItem("accent");
  let draftPack = "pixel";
  let appearances = {};
  const iconImage = form.querySelector(".settings-badge-preview img");
  const iconLabel = form.querySelector("[data-profile-icon-label]");
  const iconTrigger = form.querySelector("[data-icon-trigger]");
  const iconDialog = screen.querySelector("[data-icon-dialog]");
  const iconOptions = iconDialog.querySelector("[data-icon-options]");
  const resetDialog = screen.querySelector("[data-reset-dialog]");
  const resetTrigger = form.querySelector("[data-open-reset]");
  const links = screen.querySelector("[data-settings-links]");
  const status = screen.querySelector(".settings-feedback");
  const saveButton = screen.querySelector("[data-save]");
  const navButtons = new Map();
  const iconInputs = new Map();

  screen.querySelector("[data-backup]").href = backupUrl.href;

  function selectSection(key) {
    for (const [id, control] of navButtons) {
      if (id === key) control.setAttribute("aria-current", "location");
      else control.removeAttribute("aria-current");
    }
  }

  for (const [key, label] of sections) {
    const panel = form.querySelector(`[data-section="${key}"]`);
    const heading = panel.querySelector("legend, h2");
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = label;

    control.addEventListener("click", () => {
      selectSection(key);
      heading.focus({ preventScroll: true });
      panel.scrollIntoView({ block: "nearest" });
    });

    panel.addEventListener("focusin", () => selectSection(key));
    navButtons.set(key, control);
    links.append(control);
  }

  selectSection("profile");

  function rebuildProfileOptions() {
    iconInputs.clear();
    iconOptions.replaceChildren();

    for (const [id, { label }] of Object.entries(getProfileIcons(draftPack))) {
      const option = document.createElement("label");
      const input = document.createElement("input");
      const image = document.createElement("img");
      const text = document.createElement("span");

      input.type = "radio";
      input.name = "profileIconChoice";
      input.value = id;
      image.src = getProfileIcon(id, draftPack).url;
      image.width = 36;
      image.height = 36;
      image.alt = "";
      text.textContent = label;

      option.append(input, image, text);
      iconOptions.append(option);
      iconInputs.set(id, input);
    }
  }

  function updateIconPreview() {
    const icon = getProfileIcon(iconField.value, draftPack);
    iconImage.src = icon.url;
    iconLabel.textContent = icon.label;
  }

  function rememberAppearance() {
    appearances[draftPack] = {
      theme: modeField.value,
      accent: accentField.value,
      badge: iconField.value,
    };
  }

  function showAppearance(pack) {
    draftPack = pack;
    packField.value = pack;
    const config = themePacks[pack];
    const saved = appearances[pack];
    accentField.replaceChildren(...Object.entries(config.accents)
      .map(([value, label]) => new Option(label, value)));
    modeField.value = saved?.theme ?? "system";
    accentField.value = saved?.accent ?? config.defaultAccent;
    iconField.value = saved?.badge ?? config.defaultBadge;
    rebuildProfileOptions();
    updateIconPreview();
  }

  function fillForm(settings) {
    appearances = { ...settings.appearances };
    showAppearance(settings.themePack);

    for (const [name, value] of Object.entries(settings)) {
      if (["appearances", "themePack", "theme", "accent", "badge"].includes(name)) continue;
      const field = form.elements.namedItem(name);
      if (!field) continue;

      if (field.type === "checkbox") field.checked = value;
      else field.value = value;
    }
  }

  function setStatus(message, isError = false) {
    status.toggleAttribute("data-error", isError);
    status.textContent = message;
  }

  fillForm(readPreferences());

  packField.addEventListener("change", () => {
    rememberAppearance();
    showAppearance(packField.value);
    setStatus("Theme pack selected. Select Save changes to apply it.");
  });

  iconTrigger.addEventListener("click", () => {
    const current = iconInputs.get(iconField.value) ?? iconInputs.values().next().value;
    if (current) current.checked = true;

    iconDialog.returnValue = "";
    iconDialog.showModal();
    current?.focus();
  });

  iconDialog.addEventListener("close", () => {
    const choice = iconOptions.querySelector("input:checked");

    if (iconDialog.returnValue === "choose" && choice) {
      iconField.value = choice.value;
      updateIconPreview();
      setStatus("Profile icon selected. Select Save changes to apply it.");
    }

    iconTrigger.focus();
  });

  resetTrigger.addEventListener("click", () => {
    resetDialog.returnValue = "";
    resetDialog.showModal();
  });

  resetDialog.addEventListener("close", () => {
    if (resetDialog.returnValue !== "restore") {
      resetTrigger.focus();
      return;
    }

    fillForm(defaultPreferences);
    setStatus("Defaults loaded. Select Save changes to apply them.");
    saveButton.focus();
  });

  form.addEventListener("input", () => setStatus(""));

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!displayName.value.trim()) {
      setStatus("Enter a display name.", true);
      displayName.focus();
      return;
    }

    try {
      rememberAppearance();
      fillForm(savePreferences({
        ...Object.fromEntries(new FormData(form)),
        appearances,
      }));
      setStatus("Changes saved.");
    } catch (error) {
      console.error("Could not save preferences.", error);
      setStatus("Couldn’t save changes. Your entries are still here.", true);
    }
  });

  container.replaceChildren(screen);
}