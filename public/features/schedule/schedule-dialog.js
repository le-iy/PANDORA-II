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
  const save = form.querySelector('[type="submit"]');
  const cancelEdit = form.querySelector("[data-cancel-edit]");
  const feedback = dialog.querySelector("[data-feedback]");

  let editing = null;
  let confirmation = null;

  heading.textContent = chooseDate ? "Add event" : dateFormat.format(date);
  agenda.hidden = chooseDate;
  formHeading.hidden = chooseDate;
  form.querySelector("[data-date-field]").hidden = !chooseDate;
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
    formHeading.textContent = "Add event";
    save.textContent = "Add event";
    cancelEdit.hidden = true;
  }

  function sameEvent(current, original) {
    return current?.title === original.title && current?.time === original.time;
  }

  function refreshChangedEvents(events) {
    resetEditor();
    showEvents(events);
    onChange(date, events.length);
    feedback.textContent = "The event list changed. Select the event again.";
    titleInput.focus();
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
      titleInput.focus();
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

      const time = document.createElement("span");
      time.textContent = event.time || "No time set";

      const actions = document.createElement("div");
      actions.className = "schedule-actions";

      const edit = makeButton("Edit", () => {
        clearConfirmation();
        feedback.textContent = "";
        editing = { event, index };
        titleInput.value = event.title;
        timeInput.value = event.time;
        formHeading.textContent = "Edit event";
        save.textContent = "Save changes";
        cancelEdit.hidden = false;
        titleInput.focus();
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
    titleInput.focus();
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

    const details = { title, time: timeInput.value };
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
    titleInput.focus();
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