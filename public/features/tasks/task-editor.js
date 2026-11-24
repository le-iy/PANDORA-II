import { loadCourseCatalog } from "../../services/course-catalog.js";

function addCourseOptions(select, courses, selectedCode) {
  const codes = new Set();

  for (const course of courses) {
    if (typeof course?.code !== "string" || typeof course.name !== "string") {
      continue;
    }

    codes.add(course.code);
    select.add(new Option(`${course.code} · ${course.name}`, course.code));
  }

  if (selectedCode && !codes.has(selectedCode)) {
    select.add(new Option(selectedCode, selectedCode));
  }

  select.value = selectedCode;
}

export function openTaskEditor(task, onSave, trigger) {
  const isEditing = task !== null;
  const title = isEditing ? "Edit task" : "Add task";
  const action = isEditing ? "Save changes" : "Add task";
  const selectedCode = typeof task?.courseCode === "string" ? task.courseCode : "";

  const dialog = document.createElement("dialog");
  dialog.className = "task-editor task-form-dialog";
  dialog.setAttribute("aria-labelledby", "task-editor-heading");

  dialog.innerHTML = `
    <style>
      .task-form-dialog .task-course-select {
        box-sizing: border-box;
        width: 100%;
        min-height: 44px;
        padding: 8px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-control);
        background: var(--color-background);
        color: var(--color-text);
      }

      .task-form-dialog .task-editor-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
      }

      .task-form-dialog p {
        margin: 0;
        font-size: 0.875rem;
      }

      .task-form-dialog [data-feedback] {
        color: var(--color-danger);
      }
    </style>

    <h2 id="task-editor-heading">${title}</h2>

    <form class="tasks-form">
      <label>
        Task title
        <input name="title" maxlength="120" required autofocus>
      </label>

      <label>
        Deadline (optional)
        <input name="deadline" type="date">
      </label>

      <label>
        Course (optional)
        <select name="courseCode" class="task-course-select"
          aria-describedby="task-course-status" disabled>
          <option value="">No course</option>
        </select>
      </label>

      <label>
        EXP reward
        <input name="expReward" type="number" min="0" step="1" max="9007199254740991" required>
      </label>

      <p id="task-course-status" role="status">Loading courses…</p>
      <p data-feedback role="status"></p>

      <div class="task-editor-actions">
        <button type="button" data-close-editor>Cancel</button>
        <button type="submit" disabled>${action}</button>
      </div>
    </form>
  `;

  const form = dialog.querySelector("form");
  const titleInput = form.elements.namedItem("title");
  const deadlineInput = form.elements.namedItem("deadline");
  const courseInput = form.elements.namedItem("courseCode");
  const courseStatus = form.querySelector("#task-course-status");
  const feedback = form.querySelector("[data-feedback]");
  const save = form.querySelector('button[type="submit"]');

  titleInput.value = task?.title ?? "";
  deadlineInput.value = task?.deadline ?? "";
  const rewardInput = form.elements.namedItem("expReward");
  rewardInput.value = task?.expReward ?? 20;

  form.addEventListener("input", () => {
    feedback.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (save.disabled) return;

    const taskTitle = titleInput.value.trim();
    const expReward = rewardInput.valueAsNumber;
    if (!Number.isSafeInteger(expReward) || expReward < 0) {
      feedback.textContent = "Enter a whole EXP amount of 0 or more.";
      rewardInput.focus();
      return;
    }


    if (!taskTitle) {
      feedback.textContent = "Enter a task title.";
      titleInput.focus();
      return;
    }

    const details = {
      title: taskTitle,
      deadline: deadlineInput.value,
      expReward,
      courseCode: courseInput.value,
    };

    if (onSave(details)) {
      dialog.close();
    } else {
      feedback.textContent = "Couldn’t save the task. Your entries are still here.";
    }
  });

  form.querySelector("[data-close-editor]").addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger?.isConnected) trigger.focus();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();

  loadCourseCatalog().then((courses) => {
    if (!dialog.open) return;

    addCourseOptions(courseInput, courses, selectedCode);
    courseStatus.textContent = courses.length ? "" : "No courses available yet.";
  }).catch((error) => {
    if (!dialog.open) return;

    console.error("Could not load courses for the task editor.", error);
    addCourseOptions(courseInput, [], selectedCode);
    courseStatus.textContent = "Couldn’t load the course list. You can still save the task.";
  }).finally(() => {
    if (!dialog.open) return;

    courseInput.disabled = false;
    save.disabled = false;
  });
}