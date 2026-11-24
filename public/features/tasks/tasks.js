import { openTaskEditor } from "./task-editor.js";

const storageKey = "pandora-ii.tasks";
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

const filters = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function readTasks() {
  const tasks = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");
  return tasks;
}

function taskStatus(task) {
  if (task.completed) return "completed";
  return task.status === "in-progress" ? "in-progress" : "open";
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDeadline(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime()) || localDateKey(date) !== value) {
    return null;
  }

  return { date, key: value };
}

function describeDeadline(task, deadline, todayKey) {
  if (!deadline) return { text: "No deadline" };

  const label = dateFormat.format(deadline.date);

  if (!task.completed && deadline.key < todayKey) {
    return { text: `Overdue · ${label}`, state: "overdue" };
  }

  if (!task.completed && deadline.key === todayKey) {
    return { text: "Due today", state: "today" };
  }

  return { text: `Due ${label}` };
}

function updateTask(tasks, id, changes) {
  if (!tasks.some((task) => task.id === id)) {
    throw new Error("Task no longer exists.");
  }

  return tasks.map((task) => task.id === id ? { ...task, ...changes } : task);
}

function createAction(label, task, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", `${label}: ${task.title}`);
  button.addEventListener("click", onClick);
  return button;
}

function confirmRemoval(task, onRemove, restoreFocus) {
  const dialog = document.createElement("dialog");
  dialog.className = "task-editor";
  dialog.setAttribute("aria-labelledby", "task-remove-heading");

  dialog.innerHTML = `
    <h2 id="task-remove-heading">Remove task?</h2>
    <p data-task-name></p>
    <p class="task-feedback" role="status"></p>
    <div class="task-editor-actions">
      <button type="button" data-cancel autofocus>Keep task</button>
      <button type="button" data-remove>Remove task</button>
    </div>
  `;

  dialog.querySelector("[data-task-name]").textContent = task.title;

  dialog.querySelector("[data-cancel]").addEventListener("click", () => {
    dialog.close();
  });

  dialog.querySelector("[data-remove]").addEventListener("click", () => {
    if (onRemove()) {
      dialog.close();
      return;
    }

    dialog.querySelector('[role="status"]').textContent =
      "Couldn’t remove the task. Try again.";
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    restoreFocus();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();
}

export function renderTasks(container) {
  const screen = document.createElement("section");
  screen.className = "tasks-screen tasks-dashboard";

  screen.innerHTML = `
    <div class="tasks-heading">
      <h1>Tasks</h1>
      <button class="task-primary" type="button" data-add-task
        aria-haspopup="dialog">+ Add task</button>
    </div>

    <section class="tasks-group" aria-label="Study tasks">
      <div class="tasks-toolbar">
        <div class="task-filters" role="group" aria-label="Filter tasks by status"></div>

        <label class="task-sort">
          Sort by
          <select>
            <option value="deadline">Deadline</option>
            <option value="title">Title A–Z</option>
            <option value="completed">Recently completed</option>
          </select>
        </label>
      </div>

      <p class="task-counts" aria-live="polite"></p>
      <ul class="tasks-list"></ul>
      <p class="tasks-empty" data-empty hidden></p>
    </section>

    <p class="task-feedback" role="status"></p>
  `;

  const addButton = screen.querySelector("[data-add-task]");
  const filterBar = screen.querySelector(".task-filters");
  const sortSelect = screen.querySelector(".task-sort select");
  const counts = screen.querySelector(".task-counts");
  const list = screen.querySelector(".tasks-list");
  const empty = screen.querySelector("[data-empty]");
  const feedback = screen.querySelector('[role="status"]');

  const filterButtons = new Map();
  let activeFilter = "all";
  let tasks = [];

  function setFeedback(message, isError = false) {
    feedback.toggleAttribute("data-error", isError);
    feedback.textContent = message;
  }

  function saveChanges(change, message) {
    try {
      const updated = change(readTasks());
      localStorage.setItem(storageKey, JSON.stringify(updated));
      tasks = updated;
    } catch (error) {
      console.error("Could not save task change.", error);
      setFeedback("Couldn’t save the task change.", true);
      return false;
    }

    showTasks();
    setFeedback(message);
    return true;
  }

  function changeStatus(task, status) {
    const completed = status === "completed";
    const messages = {
      "open": "Task reopened.",
      "in-progress": "Task started.",
      "completed": "Task completed.",
    };

    const saved = saveChanges(
      (items) => updateTask(items, task.id, {
        status,
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      }),
      messages[status],
    );

    if (saved) filterButtons.get(activeFilter)?.focus();
  }

  function createRow(task, deadline, todayKey) {
    const row = document.createElement("li");
    row.className = "task-row";

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("strong");
    title.textContent = task.title;

    const state = taskStatus(task);
    const badge = document.createElement("span");
    badge.className = "task-status";
    badge.dataset.status = state;
    badge.textContent = filters.find(({ id }) => id === state).label;

    const due = describeDeadline(task, deadline, todayKey);
    const metadata = document.createElement("span");
    metadata.className = "task-meta";
    metadata.textContent = [task.courseCode, due.text].filter(Boolean).join(" · ");
    if (due.state) metadata.dataset.state = due.state;

    details.append(title, badge, metadata);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    if (state === "open") {
      actions.append(createAction("Start task", task, () => {
        changeStatus(task, "in-progress");
      }));
    }

    const nextStatus = state === "completed" ? "open" : "completed";
    const nextLabel = state === "completed" ? "Reopen" : "Mark complete";

    actions.append(createAction(nextLabel, task, () => {
      changeStatus(task, nextStatus);
    }));

    const edit = createAction("Edit", task, () => {
      openTaskEditor(task, (changes) => {
        const saved = saveChanges(
          (items) => updateTask(items, task.id, changes),
          "Task updated.",
        );

        if (saved) queueMicrotask(() => addButton.focus());
        return saved;
      }, edit);
    });
    edit.setAttribute("aria-haspopup", "dialog");

    const remove = createAction("Remove", task, () => {
      confirmRemoval(
        task,
        () => saveChanges(
          (items) => items.filter((item) => item.id !== task.id),
          "Task removed.",
        ),
        () => (remove.isConnected ? remove : addButton).focus(),
      );
    });
    remove.setAttribute("aria-haspopup", "dialog");

    actions.append(edit, remove);
    row.append(details, actions);
    return row;
  }

  function showTasks() {
    const entries = tasks
      .filter((task) => typeof task?.title === "string")
      .map((task) => ({
        task,
        state: taskStatus(task),
        deadline: parseDeadline(task.deadline),
      }));

    const totalByStatus = { all: entries.length, open: 0, "in-progress": 0, completed: 0 };

    for (const { state } of entries) totalByStatus[state] += 1;

    for (const filter of filters) {
      const button = filterButtons.get(filter.id);
      button.textContent = `${filter.label} (${totalByStatus[filter.id]})`;
      button.setAttribute("aria-pressed", String(activeFilter === filter.id));
    }

    const visible = entries.filter(
      ({ state }) => activeFilter === "all" || state === activeFilter,
    );

    if (sortSelect.value === "title") {
      visible.sort((a, b) =>
        a.task.title.localeCompare(b.task.title, undefined, { sensitivity: "base" }),
      );
    } else if (sortSelect.value === "completed") {
      const completedTime = ({ task, state }) =>
        state === "completed" ? Date.parse(task.completedAt) || 0 : 0;

      visible.sort((a, b) =>
        Number(b.state === "completed") - Number(a.state === "completed") ||
        completedTime(b) - completedTime(a),
      );
    } else {
      visible.sort((a, b) =>
        (a.deadline?.key ?? "\uffff").localeCompare(b.deadline?.key ?? "\uffff"),
      );
    }

    const todayKey = localDateKey(new Date());
    list.replaceChildren(...visible.map(({ task, deadline }) =>
      createRow(task, deadline, todayKey),
    ));

    const unfinished = totalByStatus.all - totalByStatus.completed;
    counts.textContent =
      `${unfinished} unfinished · ${totalByStatus.completed} completed`;

    empty.hidden = visible.length > 0;
    empty.textContent = activeFilter === "all"
      ? "No tasks yet. Select Add task to get started."
      : "No tasks with this status.";
  }

  for (const filter of filters) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      activeFilter = filter.id;

      // Reload on filter changes so another tab’s saved changes can appear.
      try {
        tasks = readTasks();
        showTasks();
      } catch (error) {
        console.error("Could not reload tasks.", error);
        setFeedback("Couldn’t reload saved tasks.", true);
      }
    });

    filterButtons.set(filter.id, button);
    filterBar.append(button);
  }

  sortSelect.addEventListener("change", showTasks);

  addButton.addEventListener("click", () => {
    openTaskEditor(null, (details) => {
      const task = {
        id: crypto.randomUUID(),
        ...details,
        status: "open",
        completed: false,
      };

      return saveChanges((items) => [...items, task], "Task added.");
    }, addButton);
  });

  container.replaceChildren(screen);

  try {
    tasks = readTasks();
    showTasks();
  } catch (error) {
    console.error("Could not load saved tasks.", error);
    setFeedback("Couldn’t load saved tasks.", true);
  }
}