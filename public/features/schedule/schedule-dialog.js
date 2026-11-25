import { themeAsset } from "../../services/theme-packs.js";

const eventColors = new Map([["lavender", "#A477D4"], ["rose", "#DF78AE"], ["mint", "#55AD8A"], ["sky", "#5DA5E0"], ["amber", "#DEAA50"]]);
const eventIcons = new Map([["exam", "icons/study-tools/exam-prep.svg"], ["study", "icons/study-tools/study-timer.svg"], ["assignment", "icons/study-tools/assignment.svg"], ["research", "icons/study-tools/research.svg"], ["reminder", "icons/navigation/schedule.svg"]]);

export function decorateScheduleEvent(card, event, title) {
  const color = eventColors.get(event.color);
  if (color) {
    card.style.background = "color-mix(in srgb, " + color + " 24%, var(--color-surface))";
    card.style.borderInlineStart = "3px solid " + color;
  }
  const asset = eventIcons.get(event.icon);
  if (!asset) return;
  const icon = document.createElement("img");
  icon.src = themeAsset(asset);
  icon.alt = "";
  icon.width = icon.height = 16;
  Object.assign(icon.style, { marginInlineEnd: "5px", verticalAlign: "middle", objectFit: "contain", imageRendering: "pixelated" });
  icon.addEventListener("error", () => icon.remove(), { once: true });
  title.prepend(icon);
}

import {
  parseScheduleDate,
  readScheduleEvents,
  scheduleDateKey,
  writeScheduleEvents,
} from "../../services/schedule-events.js";

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "full" });

function makeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

export function openScheduleDialog({
  date,
  trigger,
  onChange,
  chooseDate = false,
  fromRoute = false,
}) {
  const dialog = document.createElement("dialog");
  dialog.className = "schedule-dialog";
  dialog.setAttribute("aria-labelledby", "schedule-dialog-heading");

  if (fromRoute) dialog.dataset.scheduleRoute = "";

  dialog.innerHTML = `
    <div class="schedule-dialog-header">
      <h2 id="schedule-dialog-heading"></h2>
      <button type="button" data-close>Close</button>
    </div>

    <section data-events aria-label="Events for this date"></section>

    <form class="schedule-event-form">
      <h3 data-form-heading>Add event</h3>

      <label data-date-field>
        Date
        <input name="date" type="date">
      </label>

      <label>
        Event title
        <input name="title" required>
      </label>

      <label>
        Time (optional)
        <input name="time" type="time">
      </label>

      <label>Event color
        <select name="eventColor"><option value="">Theme default</option><option value="lavender">Lavender</option><option value="rose">Rose</option><option value="mint">Mint</option><option value="sky">Sky blue</option><option value="amber">Amber</option></select>
      </label>
      <label>Event visual
        <select name="eventIcon"><option value="">No icon</option><option value="exam">Exam</option><option value="study">Study session</option><option value="assignment">Assignment</option><option value="research">Research</option><option value="reminder">Reminder</option></select>
      </label>

      <div class="schedule-actions">
        <button type="submit">Add event</button>
        <button type="button" data-cancel-edit hidden>Cancel edit</button>
      </div>
    </form>

    <p data-feedback role="status"></p>
  `;

  const heading = dialog.querySelector("h2");
  const close = dialog.querySelector("[data-close]");
  const agenda = dialog.querySelector("[data-events]");
  const form = dialog.querySelector("form");
  const formHeading = form.querySelector("[data-form-heading]");
  const dateInput = form.elements.namedItem("date");
  const titleInput = form.elements.namedItem("title");
  const timeInput = form.elements.namedItem("time");
  const colorInput = form.elements.namedItem("eventColor");
  const iconInput = form.elements.namedItem("eventIcon");
  const save = form.querySelector('[type="submit"]');
  const cancelEdit = form.querySelector("[data-cancel-edit]");
  const feedback = dialog.querySelector("[data-feedback]");

  let editing = null;
  let confirmation = null;

  heading.textContent = chooseDate ? "Add event" : dateFormat.format(date);
  const addForDay = makeButton("+ Add event", () => {
    feedback.textContent = "";
    setEditorVisible(true);
    (form.hidden ? addForDay : titleInput).focus();
  });
  agenda.after(addForDay);

  function setEditorVisible(visible) {
    agenda.hidden = visible;
    addForDay.hidden = visible;
    form.hidden = !visible;
    cancelEdit.hidden = chooseDate || !visible;
    if (!chooseDate) cancelEdit.textContent = "Back to events";
  }

  setEditorVisible(chooseDate);
  formHeading.hidden = chooseDate;
  const dateField = form.querySelector("[data-date-field]");
  dateField.hidden = !chooseDate;
  titleInput.closest("label").after(dateField);
  titleInput.placeholder = "e.g. Networking quiz";
  dateInput.disabled = !chooseDate;
  dateInput.required = chooseDate;
  dateInput.value = scheduleDateKey(date);

  function clearConfirmation() {
    confirmation?.remove();
    confirmation = null;
  }

  function resetEditor() {
    editing = null;
    titleInput.value = "";
    timeInput.value = "";
    colorInput.value = iconInput.value = "";
    formHeading.textContent = "Add event";
    save.textContent = "Add event";
    setEditorVisible(chooseDate);
  }

  function sameEvent(current, original) {
    return current?.title === original.title && current?.time === original.time && (current?.color ?? "") === (original.color ?? "") && (current?.icon ?? "") === (original.icon ?? "");
  }

  function refreshChangedEvents(events) {
    resetEditor();
    showEvents(events);
    onChange(date, events.length);
    feedback.textContent = "The event list changed. Select the event again.";
    (form.hidden ? addForDay : titleInput).focus();
  }

  function confirmRemoval(item, event, index, triggerButton) {
    clearConfirmation();
    feedback.textContent = "";

    const panel = document.createElement("div");
    panel.className = "schedule-actions";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", `Confirm deletion of ${event.title}`);

    const message = document.createElement("p");
    message.textContent = `Delete “${event.title}”?`;

    const keep = makeButton("Keep event", () => {
      clearConfirmation();
      triggerButton.focus();
    });

    const remove = makeButton("Delete event", () => {
      let events;

      try {
        events = readScheduleEvents(date);

        if (!sameEvent(events[index], event)) {
          refreshChangedEvents(events);
          return;
        }

        events.splice(index, 1);
        writeScheduleEvents(date, events);
      } catch (error) {
        console.error("Could not delete event.", error);
        feedback.textContent = "Couldn’t delete the event. Try again.";
        return;
      }

      if (editing?.index === index) {
        resetEditor();
      } else if (editing && editing.index > index) {
        editing.index -= 1;
      }

      showEvents(events);
      onChange(date, events.length);
      feedback.textContent = "Event deleted.";
      (form.hidden ? addForDay : titleInput).focus();
    });

    remove.className = "schedule-danger";
    panel.append(message, keep, remove);
    item.append(panel);
    confirmation = panel;
    keep.focus();
  }

  function showEvents(events) {
    clearConfirmation();

    if (!events.length) {
      const message = document.createElement("p");
      message.textContent = "No events scheduled for this day.";
      agenda.replaceChildren(message);
      return;
    }

    const list = document.createElement("ul");
    list.className = "schedule-event-list";

    const sorted = events
      .map((event, index) => ({ event, index }))
      .sort((a, b) =>
        (a.event.time || "24:00").localeCompare(b.event.time || "24:00"),
      );

    for (const { event, index } of sorted) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = event.title;
      decorateScheduleEvent(item, event, title);

      const time = document.createElement("span");
      time.textContent = event.time || "No time set";

      const actions = document.createElement("div");
      actions.className = "schedule-actions";

      const edit = makeButton("Edit", () => {
        clearConfirmation();
        feedback.textContent = "";
        editing = { event, index };
        setEditorVisible(true);
        titleInput.value = event.title;
        timeInput.value = event.time;
        colorInput.value = eventColors.has(event.color) ? event.color : "";
        iconInput.value = eventIcons.has(event.icon) ? event.icon : "";
        formHeading.textContent = "Edit event";
        save.textContent = "Save changes";
        cancelEdit.hidden = false;
        (form.hidden ? addForDay : titleInput).focus();
      });

      const remove = makeButton("Delete", () => {
        confirmRemoval(item, event, index, remove);
      });

      edit.setAttribute("aria-label", `Edit ${event.title}`);
      remove.setAttribute("aria-label", `Delete ${event.title}`);

      actions.append(edit, remove);
      item.append(title, time, actions);
      list.append(item);
    }

    agenda.replaceChildren(list);
  }

  close.addEventListener("click", () => dialog.close());

  cancelEdit.addEventListener("click", () => {
    resetEditor();
    feedback.textContent = "";
    (form.hidden ? addForDay : titleInput).focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const targetDate = chooseDate ? parseScheduleDate(dateInput.value) : date;

    if (!targetDate || !title) {
      feedback.textContent = "Enter a valid date and event title.";
      (targetDate ? titleInput : dateInput).focus();
      return;
    }

    const details = { title, time: timeInput.value, color: colorInput.value, icon: iconInput.value };
    const isEditing = editing !== null;
    let events;

    try {
      events = readScheduleEvents(targetDate);

      if (editing) {
        if (!sameEvent(events[editing.index], editing.event)) {
          refreshChangedEvents(events);
          return;
        }

        events[editing.index] = { ...events[editing.index], ...details };
      } else {
        events.push(details);
      }

      writeScheduleEvents(targetDate, events);
    } catch (error) {
      console.error("Could not save event.", error);
      feedback.textContent = "Couldn’t save the event. Your entries are still here.";
      return;
    }

    onChange(targetDate, events.length, chooseDate);

    if (chooseDate) {
      dialog.close();
      return;
    }

    resetEditor();
    showEvents(events);
    feedback.textContent = isEditing ? "Changes saved." : "Event added.";
    (form.hidden ? addForDay : titleInput).focus();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger?.isConnected) trigger.focus();
  }, { once: true });

  if (!chooseDate) {
    try {
      showEvents(readScheduleEvents(date));
    } catch (error) {
      console.error("Could not load day agenda.", error);
      feedback.textContent = "Couldn’t load events for this day.";
    }
  }

  document.body.append(dialog);
  dialog.showModal();
  (chooseDate ? dateInput : close).focus();
}