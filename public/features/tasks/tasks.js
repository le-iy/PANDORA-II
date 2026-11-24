import { parseScheduleDate, scheduleDateKey } from "../../services/schedule-events.js";
import { changeTask, readTasks, writeTasks } from "../../services/task-store.js";
import { openTaskCompletion } from "./task-completion.js";
import { openTaskEditor } from "./task-editor.js";
import { openTaskDetails, taskStatus, taskStatusLabel } from "./task-details.js";

const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

const filters = [
  ["all", "All"],
  ["open", "Open"],
  ["in-progress", "In progress"],
  ["completed", "Completed"],
];

function describeDeadline(task, date, todayKey) {
  if (!date) return { text: "No deadline" };

  const label = dateFormat.format(date);
  const key = scheduleDateKey(date);

  if (!task.completed && key < todayKey) {
    return { text: `Overdue · ${label}`, state: "overdue" };
  }

  if (!task.completed && key === todayKey) {
    return { text: "Due today", state: "today" };
  }

  return { text: `Due ${label}` };
}

function createAction(label, task, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", `${label}: ${task.title}`);
  button.addEventListener("click", onClick);
  return button;
}

function confirmRemoval(screen, task, onRemove, onClose) {
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
  dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());

  dialog.querySelector("[data-remove]").addEventListener("click", () => {
    if (onRemove()) {
      dialog.close();
    } else {
      dialog.querySelector('[role="status"]').textContent =
        "Couldn’t remove the task. Try again.";
    }
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (screen.isConnected) onClose();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
}

export function renderTasks(container, taskId = null) {
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

  const add = screen.querySelector("[data-add-task]");
  const sort = screen.querySelector("select");
  const filterBar = screen.querySelector(".task-filters");
  const counts = screen.querySelector(".task-counts");
  const list = screen.querySelector(".tasks-list");
  const empty = screen.querySelector("[data-empty]");
  const feedback = screen.querySelector('[role="status"]');

  const buttons = new Map();
  let activeFilter = "all";
  let tasks = [];

  function setFeedback(text, error = false) {
    feedback.toggleAttribute("data-error", error);
    feedback.textContent = text;
  }

  function saveChanges(transform, message) {
    try {
      const updated = transform(readTasks());
      writeTasks(updated);
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

  function restoreFocus(trigger) {
    (trigger?.isConnected ? trigger : add).focus();
  }

  function editTask(task, trigger) {
    openTaskEditor(task, (changes) => {
      const saved = saveChanges(
        (items) => changeTask(items, task.id, changes),
        "Task updated.",
      );

      if (saved) queueMicrotask(() => restoreFocus(trigger));
      return saved;
    }, trigger);
  }

  function completeTask(task, trigger) {
    openTaskCompletion(screen, task, {
      onComplete() {
        return saveChanges((items) => {
          const current = items.find((item) => item?.id === task.id);

          if (!current) throw new Error("Task no longer exists.");
          if (current.completed) return items;

          return changeTask(items, task.id, {
            status: "completed",
            completed: true,
            completedAt: new Date().toISOString(),
          });
        }, "Task completed.");
      },
      onClose: () => restoreFocus(trigger),
    });
  }

  function showDetails(task, trigger) {
    openTaskDetails(screen, task, {
      onEdit: () => editTask(task, trigger),
      onComplete: () => completeTask(task, trigger),
      onClose: () => restoreFocus(trigger),
    });
  }

  function changeOpenStatus(task, status) {
    const saved = saveChanges(
      (items) => changeTask(items, task.id, {
        status,
        completed: false,
        completedAt: null,
      }),
      status === "open" ? "Task reopened." : "Task started.",
    );

    if (saved) buttons.get(activeFilter)?.focus();
  }

  function createRow({ task, state, deadline }, todayKey) {
    const row = document.createElement("li");
    row.className = "task-row";

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("button");
    title.type = "button";
    title.className = "task-title-button";
    title.textContent = task.title;
    title.setAttribute("aria-haspopup", "dialog");
    title.addEventListener("click", () => showDetails(task, title));

    const badge = document.createElement("span");
    badge.className = "task-status";
    badge.dataset.status = state;
    badge.textContent = taskStatusLabel(task);

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
        changeOpenStatus(task, "in-progress");
      }));
    }

    if (state === "completed") {
      actions.append(createAction("Reopen", task, () => changeOpenStatus(task, "open")));
    } else {
      const complete = createAction("Mark complete", task, () => {
        completeTask(task, complete);
      });

      complete.setAttribute("aria-haspopup", "dialog");
      actions.append(complete);
    }

    const edit = createAction("Edit", task, () => editTask(task, edit));
    edit.setAttribute("aria-haspopup", "dialog");

    const remove = createAction("Remove", task, () => {
      confirmRemoval(
        screen,
        task,
        () => saveChanges(
          (items) => items.filter((item) => item?.id !== task.id),
          "Task removed.",
        ),
        () => restoreFocus(remove),
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
        deadline: parseScheduleDate(task.deadline),
      }));

    const totals = { all: entries.length, open: 0, "in-progress": 0, completed: 0 };
    for (const { state } of entries) totals[state] += 1;

    for (const [id, label] of filters) {
      const button = buttons.get(id);
      button.textContent = `${label} (${totals[id]})`;
      button.setAttribute("aria-pressed", String(id === activeFilter));
    }

    const visible = entries.filter(
      ({ state }) => activeFilter === "all" || state === activeFilter,
    );

    if (sort.value === "title") {
      visible.sort((a, b) =>
        a.task.title.localeCompare(b.task.title, undefined, { sensitivity: "base" }),
      );
    } else if (sort.value === "completed") {
      visible.sort((a, b) =>
        Number(b.state === "completed") - Number(a.state === "completed") ||
        (Date.parse(b.task.completedAt) || 0) - (Date.parse(a.task.completedAt) || 0),
      );
    } else {
      visible.sort((a, b) => {
        const first = a.deadline?.getTime() ?? Infinity;
        const second = b.deadline?.getTime() ?? Infinity;
        return first === second ? 0 : first - second;
      });
    }

    const todayKey = scheduleDateKey(new Date());
    list.replaceChildren(...visible.map((entry) => createRow(entry, todayKey)));

    counts.textContent =
      `${totals.all - totals.completed} unfinished · ${totals.completed} completed`;

    empty.hidden = visible.length > 0;
    empty.textContent = activeFilter === "all"
      ? "No tasks yet. Select Add task to get started."
      : "No tasks with this status.";
  }

  for (const [id, label] of filters) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;

    button.addEventListener("click", () => {
      try {
        tasks = readTasks();
        activeFilter = id;
        showTasks();
      } catch (error) {
        console.error("Could not reload tasks.", error);
        setFeedback("Couldn’t reload saved tasks.", true);
      }
    });

    buttons.set(id, button);
    filterBar.append(button);
  }

  sort.addEventListener("change", showTasks);

  add.addEventListener("click", () => {
    openTaskEditor(null, (details) => {
      const task = {
        id: crypto.randomUUID(),
        ...details,
        status: "open",
        completed: false,
      };

      return saveChanges((items) => [...items, task], "Task added.");
    }, add);
  });

  container.replaceChildren(screen);

  try {
    tasks = readTasks();
    showTasks();

    if (taskId !== null) {
      const task = tasks.find((item) =>
        typeof item?.title === "string" && String(item.id) === taskId,
      );

      if (task) {
        showDetails(task, add);
      } else {
        setFeedback("Task not found. You can still use the task list.", true);
      }
    }
  } catch (error) {
    console.error("Could not load saved tasks.", error);
    setFeedback("Couldn’t load saved tasks.", true);
  }
}