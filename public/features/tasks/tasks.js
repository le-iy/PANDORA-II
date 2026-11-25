import { globalIcons } from "../../services/theme-packs.js";
import { activeThemePack } from "../../services/theme-packs.js";
import { createTaskIcon, openCourseIconPicker } from "../courses/course-icon.js";
import { getExperience } from "../../services/experience.js";
import { readPreferences } from "../../services/preferences.js";
import { parseScheduleDate, scheduleDateKey } from "../../services/schedule-events.js";
import { countTasksCompletedToday } from "../../services/study-goals.js";
import { changeTask, readTasks, writeTasks } from "../../services/task-store.js";
import { openTaskCompletion } from "./task-completion.js";
import { openTaskDetails, taskStatus, taskStatusLabel } from "./task-details.js";
import { openTaskEditor } from "./task-editor.js";

const dashboardStyles = new URL("../../styles/tasks-dashboard.css", import.meta.url);
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

const filters = [
  ["open", "Open", "Open quests"],
  ["in-progress", "In progress", "Quests in progress"],
  ["completed", "Completed", "Completed quests"],
];

function loadDashboardStyles() {
  if (document.head.querySelector("[data-task-dashboard-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = dashboardStyles.href;
  link.dataset.taskDashboardStyles = "";
  document.head.append(link);
}

function makeElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function taskButton(label, task, action, opensDialog = false) {
  const button = makeElement("button", label);
  button.type = "button";
  button.setAttribute("aria-label", `${label}: ${task.title}`);
  if (opensDialog) button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", () => action(button));
  return button;
}

function deadlineText(task, date, todayKey) {
  if (!date) return "No deadline";

  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(task.deadlineTime ?? "") ? new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date("2000-01-01T" + task.deadlineTime)) : "";
  const label = [dateFormat.format(date), time].filter(Boolean).join(" · ");
  const key = scheduleDateKey(date);

  if (!task.completed && key < todayKey) return `Overdue · ${label}`;
  if (!task.completed && key === todayKey) return time ? `Due today · ${time}` : "Due today";

  return label;
}

function byDeadline(a, b) {
  if (!a.date) return b.date ? 1 : 0;
  if (!b.date) return -1;
  return a.date - b.date;
}

function confirmRemoval(screen, task, onRemove, onClose) {
  const dialog = makeElement("dialog", undefined, "task-editor");
  dialog.setAttribute("aria-labelledby", "task-remove-heading");
  dialog.innerHTML = `
    <h2 id="task-remove-heading">Remove task?</h2>
    <p data-task-name></p>
    <p role="status" class="task-feedback"></p>
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
      return;
    }

    dialog.querySelector('[role="status"]').textContent =
      "Couldn’t remove the task. Try again.";
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (screen.isConnected) onClose();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
}

export function renderTasks(container, taskId = null) {
  loadDashboardStyles();

  const screen = makeElement("section", undefined, "tasks-screen tasks-dashboard");
  screen.innerHTML = `
    <header class="tasks-heading">
      <h1>Tasks</h1>
      <button class="task-primary" type="button" data-add-task
        aria-haspopup="dialog">+ Add task</button>
    </header>

    <dl class="task-dashboard-summary" aria-label="Task totals">
      <div><dt>Tasks due</dt><dd data-total="open">—</dd></div>
      <div><dt>Tasks finished</dt><dd data-total="completed">—</dd></div>
      <div><dt>In progress</dt><dd data-total="in-progress">—</dd></div>
      <div><dt>Daily quest goal</dt><dd data-goal>—</dd></div>
    </dl>

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

    <div class="task-dashboard-layout">
      <section class="tasks-group task-quest-panel" aria-labelledby="task-list-heading">
        <div class="task-quest-heading">
          <h2 id="task-list-heading">Open quests</h2>
          <p class="task-counts" role="status"></p>
        </div>

        <div class="task-table-scroll" role="region" tabindex="0"
          aria-label="Quest table. Scroll to see all columns.">
          <table class="task-quest-table" aria-labelledby="task-list-heading">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Task</th>
                <th scope="col">Deadline</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <p class="tasks-empty" hidden></p>
      </section>

      <aside class="task-dashboard-sidebar" aria-label="Quest overview">
        <section class="tasks-group task-rewards-panel">
          <h2>Quest rewards</h2>
          <p data-level role="status">Loading level…</p>
          <progress data-level-progress aria-label="EXP toward the next level" hidden></progress>
          <p data-next-level></p>
        </section>

        <section class="tasks-group task-next-panel">
          <h2>Next up</h2>
          <ul class="task-next-list"></ul>
        </section>
      </aside>
    </div>

    <p class="task-feedback" role="status"></p>
  `;

  const add = screen.querySelector("[data-add-task]");
  const sort = screen.querySelector("select");
  const filterBar = screen.querySelector(".task-filters");
  const listHeading = screen.querySelector("#task-list-heading");
  const counts = screen.querySelector(".task-counts");
  const tableRegion = screen.querySelector(".task-table-scroll");
  const rows = screen.querySelector("tbody");
  const empty = screen.querySelector(".tasks-empty");
  const nextUp = screen.querySelector(".task-next-list");
  const feedback = screen.querySelector(".task-feedback");
  const filterButtons = new Map();

  let activeFilter = "open";
  let tasks = [];

  function setFeedback(text, error = false) {
    feedback.toggleAttribute("data-error", error);
    feedback.textContent = text;
  }

  function restoreFocus(trigger) {
    if (screen.isConnected) (trigger?.isConnected ? trigger : add).focus();
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
          if (taskStatus(current) === "completed") return items;

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

    if (saved) filterButtons.get(activeFilter)?.focus();
  }

  function createActionMenu(task, state) {
    const menu = makeElement("div", undefined, "task-row-menu");
    const summary = makeElement("button", "⋯");
    summary.setAttribute("aria-label", `Actions for ${task.title}`);

    const panel = makeElement("div", undefined, "task-row-menu-panel");
    summary.type = "button";
    panel.id = "task-actions-" + crypto.randomUUID();
    panel.setAttribute("popover", "auto");
    summary.setAttribute("popovertarget", panel.id);
    summary.setAttribute("aria-controls", panel.id);

    function addAction(label, action, opensDialog = false) {
      panel.append(taskButton(label, task, () => {
        panel.hidePopover();
        summary.focus();
        action();
      }, opensDialog));
    }

    if (state === "open") {
      addAction("Start task", () => changeOpenStatus(task, "in-progress"));
    }

    if (state === "completed") {
      addAction("Reopen", () => changeOpenStatus(task, "open"));
    } else {
      addAction("Mark complete", () => completeTask(task, summary), true);
    }

    addAction("Change icon", () => {
      const pack = activeThemePack();
      openCourseIconPicker(summary, {
        kind: "task", name: task.title, choice: Object.hasOwn(globalIcons, task.icons?.global) ? task.icons.global : task.icons?.[pack],
        onUse(id) {
          const saved = saveChanges((items) => {
            const current = items.find((item) => item?.id === task.id);
            const icons = { ...current?.icons };
            if (Object.hasOwn(globalIcons, id)) {
              icons.global = id;
            } else {
              delete icons.global;
              if (id) icons[pack] = id;
              else delete icons[pack];
            }
            return changeTask(items, task.id, { icons });
          }, "Task icon updated.");
          if (!saved) throw new Error("Could not save task icon.");
          queueMicrotask(() => restoreFocus(summary));
        },
      });
    }, true);
    addAction("Edit", () => editTask(task, summary), true);
    addAction("Remove", () => {
      confirmRemoval(
        screen,
        task,
        () => saveChanges(
          (items) => items.filter((item) => item?.id !== task.id),
          "Task removed.",
        ),
        () => restoreFocus(summary),
      );
    }, true);

    menu.append(summary, panel);
    return menu;
  }

  function createRow({ task, state, date }, todayKey) {
    const row = makeElement("tr");
    const subject = makeElement("td", task.courseCode || "—");
    const titleCell = makeElement("th");
    titleCell.scope = "row";

    const title = taskButton(task.title, task, (trigger) => showDetails(task, trigger), true);
    title.className = "task-title-button";
    title.setAttribute("aria-label", `View task: ${task.title}`);
    const identity = makeElement("div");
    Object.assign(identity.style, { display: "flex", alignItems: "center", gap: "8px" });
    identity.append(createTaskIcon(task), title);
    titleCell.append(identity);

    const deadline = makeElement("td", deadlineText(task, date, todayKey));
    if (date && state !== "completed" && scheduleDateKey(date) < todayKey) {
      deadline.className = "task-deadline-overdue";
    }

    const statusCell = makeElement("td");
    const badge = makeElement("span", taskStatusLabel(task), "task-status");
    badge.dataset.status = state;
    statusCell.append(badge);

    const actions = makeElement("td");
    actions.append(createActionMenu(task, state));
    row.append(subject, titleCell, deadline, statusCell, actions);
    return row;
  }

  function showNextUp(openEntries, todayKey) {
    const upcoming = openEntries
      .filter(({ date }) => date && scheduleDateKey(date) >= todayKey)
      .sort(byDeadline)
      .slice(0, 3);

    nextUp.replaceChildren();

    if (!upcoming.length) {
      nextUp.append(makeElement("li", "No upcoming deadlines."));
      return;
    }

    for (const { task, date } of upcoming) {
      const item = makeElement("li");
      const title = taskButton(
        task.title, task, (trigger) => showDetails(task, trigger), true,
      );
      title.className = "task-title-button";
      title.setAttribute("aria-label", `View task: ${task.title}`);
      const detail = [deadlineText(task, date, todayKey), task.courseCode]
        .filter(Boolean)
        .join(" · ");

      item.append(title, makeElement("span", detail));
      nextUp.append(item);
    }
  }

  function showTasks() {
    const entries = tasks
      .filter((task) => typeof task?.title === "string")
      .map((task) => ({
        task,
        state: taskStatus(task),
        date: parseScheduleDate(task.deadline),
      }));

    const open = entries.filter(({ state }) => state !== "completed");
    const totals = {
      open: open.length,
      "in-progress": open.filter(({ state }) => state === "in-progress").length,
      completed: entries.length - open.length,
    };
    const todayKey = scheduleDateKey(new Date());

    for (const [id, label, heading] of filters) {
      const control = filterButtons.get(id);
      control.textContent = `${label} (${totals[id]})`;
      control.setAttribute("aria-pressed", String(id === activeFilter));
      screen.querySelector(`[data-total="${id}"]`).textContent = String(totals[id]);

      if (id === activeFilter) listHeading.textContent = heading;
    }

    try {
      const goal = readPreferences().dailyTaskGoal;
      screen.querySelector("[data-goal]").textContent =
        `${countTasksCompletedToday()} / ${goal}`;
    } catch (error) {
      console.error("Could not load daily quest goal.", error);
      screen.querySelector("[data-goal]").textContent = "—";
    }

    const visible = activeFilter === "open"
      ? open
      : entries.filter(({ state }) => state === activeFilter);

    if (sort.value === "title") {
      visible.sort((a, b) =>
        a.task.title.localeCompare(b.task.title, undefined, { sensitivity: "base" }),
      );
    } else if (sort.value === "completed") {
      visible.sort((a, b) =>
        (Date.parse(b.task.completedAt) || 0) - (Date.parse(a.task.completedAt) || 0),
      );
    } else {
      visible.sort(byDeadline);
    }

    rows.replaceChildren(...visible.map((entry) => createRow(entry, todayKey)));
    counts.textContent = `${visible.length} ${visible.length === 1 ? "quest" : "quests"}`;
    tableRegion.hidden = !visible.length;
    empty.hidden = Boolean(visible.length);
    empty.textContent = entries.length
      ? "No quests in this view."
      : "No tasks yet. Select Add task to get started.";

    showNextUp(open, todayKey);
  }

  async function showRewards() {
    const level = screen.querySelector("[data-level]");

    try {
      const experience = await getExperience();
      if (!screen.isConnected) return;

      const progress = screen.querySelector("[data-level-progress]");
      progress.max = experience.expPerLevel;
      progress.value = experience.levelExp;
      progress.hidden = false;
      level.textContent =
        experience.atCap ? "Level 100 · Maximum level" :
        `Level ${experience.level} · ${experience.levelExp} / ${experience.expPerLevel} EXP`;
      screen.querySelector("[data-next-level]").textContent =
        experience.atCap ? "All 20 ranks unlocked" :
        `${experience.expToNextLevel} EXP to Level ${experience.level + 1}`;
    } catch (error) {
      console.error("Could not load quest rewards.", error);
      level.textContent = "Couldn’t load your level.";
    }
  }

  for (const [id, label] of filters) {
    const control = makeElement("button", label);
    control.type = "button";
    control.addEventListener("click", () => {
      try {
        tasks = readTasks();
        activeFilter = id;
        sort.querySelector('[value="completed"]').disabled = id !== "completed";
        if (id !== "completed" && sort.value === "completed") sort.value = "deadline";
        showTasks();
      } catch (error) {
        console.error("Could not reload tasks.", error);
        setFeedback("Couldn’t reload saved tasks.", true);
      }
    });
    filterButtons.set(id, control);
    filterBar.append(control);
  }

  sort.querySelector('[value="completed"]').disabled = true;
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
  showRewards();

  try {
    tasks = readTasks();
    showTasks();

    if (taskId !== null) {
      const task = tasks.find((item) =>
        typeof item?.title === "string" && String(item.id) === taskId,
      );

      if (task) showDetails(task, add);
      else setFeedback("Task not found. You can still use the task list.", true);
    }
  } catch (error) {
    console.error("Could not load saved tasks.", error);
    tableRegion.hidden = true;
    setFeedback("Couldn’t load saved tasks.", true);
  }
}