import { readPreferences } from "../services/preferences.js";
import { readStudyReminders } from "../services/study-reminders.js";

export function openReminders(trigger) {
  if (document.querySelector("dialog[data-reminders-dialog]:modal")) return;

  const dialog = document.createElement("dialog");
  dialog.className = "header-search-dialog reminders-dialog";
  dialog.dataset.remindersDialog = "";
  dialog.setAttribute("aria-labelledby", "reminders-heading");

  dialog.innerHTML = `
    <div class="search-dialog-heading">
      <h2 id="reminders-heading">Reminders</h2>
      <button type="button" data-close autofocus>Close</button>
    </div>
    <div data-reminder-sections></div>
    <a class="reminders-settings-link" href="#/settings">Reminder settings</a>
  `;

  const content = dialog.querySelector("[data-reminder-sections]");
  const sections = readStudyReminders(readPreferences());
  const listeners = new AbortController();
  let restoreFocus = true;

  for (const { label, rows, empty } of sections) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = label;
    section.append(heading);

    if (rows.length === 0) {
      const message = document.createElement("p");
      message.textContent = empty;
      section.append(message);
    } else {
      const list = document.createElement("ul");

      for (const row of rows) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.className = "search-result-link";
        link.href = row.href;

        const title = document.createElement("strong");
        title.textContent = row.title;

        const detail = document.createElement("span");
        detail.className = "search-result-category";
        detail.textContent = row.detail;

        link.append(title, detail);
        item.append(link);
        list.append(item);
      }

      section.append(list);
    }

    content.append(section);
  }

  if (sections.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Turn on reminders in Settings to see them here.";
    content.append(message);
  }

  dialog.querySelector("[data-close]").addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    restoreFocus = link.hash === window.location.hash;
    dialog.close();
  });

  window.addEventListener("hashchange", () => {
    if (!dialog.open) return;
    restoreFocus = false;
    dialog.close();
  }, { signal: listeners.signal });

  dialog.addEventListener("close", () => {
    listeners.abort();
    dialog.remove();
    if (restoreFocus && trigger.isConnected) trigger.focus();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();
}