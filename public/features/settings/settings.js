import {
  applyPreferences,
  defaultPreferences,
  readPreferences,
  savePreferences,
} from "../../services/preferences.js";

import {
  getScholarBadge,
  goalLimits,
  scholarBadges,
} from "../../services/study-goals.js";

const backupUrl = new URL("../../backup.html", import.meta.url);

export function applySavedSettings() {
  applyPreferences();
}

export function renderSettings(container) {
  const screen = document.createElement("section");
  screen.className = "settings-screen settings-dashboard";
  screen.setAttribute("aria-labelledby", "settings-heading");

  const taskGoal = goalLimits.dailyTaskGoal;
  const expGoal = goalLimits.dailyExpGoal;

  screen.innerHTML = `
    <h1 id="settings-heading">Settings</h1>

    <form class="settings-form">
      <div class="settings-preferences">
        <fieldset class="settings-card">
          <legend>Profile</legend>
          <label>
            Display name
            <input name="displayName" maxlength="60" required>
          </label>
          <label>
            Scholar badge
            <select name="badge"></select>
          </label>
          <div class="settings-badge-preview">
            <img width="40" height="40" alt="">
            <span data-badge-label></span>
          </div>
        </fieldset>

        <fieldset class="settings-card">
          <legend>Appearance</legend>
          <label>
            Theme
            <select name="theme">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Accent color
            <select name="accent">
              <option value="lavender">Lavender</option>
              <option value="rose">Rose</option>
              <option value="sage">Sage</option>
            </select>
          </label>
          <label>
            Motion
            <select name="motion">
              <option value="system">Follow system</option>
              <option value="reduced">Reduce motion</option>
            </select>
          </label>
        </fieldset>

        <fieldset class="settings-card">
          <legend>Study preferences</legend>
          <label>
            Schedule week starts on
            <select name="weekStart">
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
          </label>
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
        </fieldset>

        <fieldset class="settings-card settings-reminders">
          <legend>In-app reminders</legend>
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
      </div>

      <div class="settings-actions">
        <button class="settings-action settings-action-primary" type="submit">
          Save changes
        </button>
        <button class="settings-action" type="button" data-open-reset
          aria-haspopup="dialog">Restore defaults</button>
      </div>

      <p class="settings-feedback" role="status"></p>
    </form>

    <section class="settings-card" aria-labelledby="settings-backup-heading">
      <h2 id="settings-backup-heading">Backup &amp; Restore</h2>
      <p>Export or restore study data and uploaded PDFs, or export a CSV report.</p>
      <a class="settings-action" data-backup>Open Backup &amp; Restore</a>
    </section>

    <dialog class="settings-reset-dialog"
      aria-labelledby="settings-reset-heading"
      aria-describedby="settings-reset-description">
      <h2 id="settings-reset-heading">Restore default settings?</h2>
      <p id="settings-reset-description">
        Load the default profile, appearance, and study preferences.
        Select Save changes to apply them.
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
  const badgeSelect = form.elements.namedItem("badge");
  const badgeImage = form.querySelector(".settings-badge-preview img");
  const badgeLabel = form.querySelector("[data-badge-label]");
  const status = form.querySelector('[role="status"]');
  const save = form.querySelector('[type="submit"]');
  const reset = form.querySelector("[data-open-reset]");
  const dialog = screen.querySelector("dialog");

  screen.querySelector("[data-backup]").href = backupUrl.href;

  for (const [id, badge] of Object.entries(scholarBadges)) {
    badgeSelect.add(new Option(badge.label, id));
  }

  function updateBadgePreview() {
    const badge = getScholarBadge(badgeSelect.value);
    badgeImage.src = badge.url;
    badgeLabel.textContent = badge.label;
  }

  function fillForm(settings) {
    for (const [name, value] of Object.entries(settings)) {
      const field = form.elements.namedItem(name);

      if (field.type === "checkbox") field.checked = value;
      else field.value = value;
    }

    updateBadgePreview();
  }

  function setStatus(message, isError = false) {
    status.toggleAttribute("data-error", isError);
    status.textContent = message;
  }

  fillForm(readPreferences());

  reset.addEventListener("click", () => {
    dialog.returnValue = "";
    dialog.showModal();
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "restore") {
      reset.focus();
      return;
    }

    fillForm(defaultPreferences);
    setStatus("Defaults loaded. Select Save changes to apply them.");
    save.focus();
  });

  badgeSelect.addEventListener("change", updateBadgePreview);
  form.addEventListener("input", () => setStatus(""));

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!displayName.value.trim()) {
      setStatus("Enter a display name.", true);
      displayName.focus();
      return;
    }

    try {
      fillForm(savePreferences(Object.fromEntries(new FormData(form))));
      setStatus("Changes saved.");
    } catch (error) {
      console.error("Could not save preferences.", error);
      setStatus("Couldn’t save changes. Your entries are still here.", true);
    }
  });

  container.replaceChildren(screen);
}