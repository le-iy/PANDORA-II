import { parseScheduleDate } from "../../services/schedule-events.js";

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

export function taskStatus(task) {
  if (task.completed) return "completed";
  return task.status === "in-progress" ? "in-progress" : "open";
}

export function taskStatusLabel(task) {
  const labels = {
    open: "Open",
    "in-progress": "In progress",
    completed: "Completed",
  };

  return labels[taskStatus(task)];
}

export function openTaskDetails(screen, task, { onEdit, onComplete, onClose }) {
  const dialog = document.createElement("dialog");
  dialog.className = "task-editor";
  dialog.setAttribute("aria-labelledby", "task-details-title");

  dialog.innerHTML = `
    <h2 id="task-details-title"></h2>

    <dl class="task-detail-fields">
      <dt>Status</dt>
      <dd data-status></dd>
      <dt>Course</dt>
      <dd data-course></dd>
      <dt>Deadline</dt>
      <dd data-deadline></dd>
    </dl>

    <div class="task-editor-actions">
      <button type="button" data-close autofocus>Close</button>
      <button type="button" data-edit aria-haspopup="dialog">Edit task</button>
      <button type="button" class="task-primary" data-complete
        aria-haspopup="dialog">Mark complete</button>
    </div>
  `;

  dialog.querySelector("h2").textContent = task.title;
  dialog.querySelector("[data-status]").textContent = taskStatusLabel(task);
  dialog.querySelector("[data-course]").textContent = task.courseCode || "No course";

  const deadline = parseScheduleDate(task.deadline);
  dialog.querySelector("[data-deadline]").textContent = deadline
    ? dateFormat.format(deadline)
    : "No deadline";

  let nextAction = onClose;

  function closeWith(action) {
    nextAction = action;
    dialog.close();
  }

  dialog.querySelector("[data-close]").addEventListener("click", () => {
    dialog.close();
  });

  dialog.querySelector("[data-edit]").addEventListener("click", () => {
    closeWith(onEdit);
  });

  const complete = dialog.querySelector("[data-complete]");
  complete.hidden = taskStatus(task) === "completed";
  complete.addEventListener("click", () => closeWith(onComplete));

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (screen.isConnected) nextAction();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
}