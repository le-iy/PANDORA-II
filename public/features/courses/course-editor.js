import {
  normalizeCourseCode,
  saveCustomCourse,
} from "../../services/course-catalog.js";

import {
  createCourseIcon,
  getCourseIconLabel,
  openCourseIconPicker,
  saveCourseIconChoice,
} from "./course-icon.js";

export function openAddCourse(screen, trigger, catalog, onSaved, semester) {
  const dialog = document.createElement("dialog");
  dialog.className = "course-dialog";
  dialog.setAttribute("aria-labelledby", "course-dialog-heading");

  dialog.innerHTML = `
    <h2 id="course-dialog-heading">Add course</h2>

    <form>
      <label>
        Course code
        <input name="code" maxlength="12" required autofocus>
      </label>

      <label>
        Course name
        <input name="name" maxlength="120" required>
      </label>

      <label>
        Class type
        <select name="type" required>
          <option value="">Choose a class type</option>
          <option value="lecture">Lecture</option>
          <option value="laboratory">Laboratory</option>
        </select>
      </label>

      <label>
        Semester
        <select name="semester">
          <option value="current">Current semester</option>
          <option value="previous">Previous semester</option>
        </select>
      </label>

      <fieldset>
        <legend>Course icon</legend>
        <div class="course-dialog-actions">
          <div data-icon-preview></div>
          <span data-icon-label></span>
          <button type="button" data-change-icon aria-haspopup="dialog">
            Change icon
          </button>
        </div>
      </fieldset>

      <p class="course-feedback" role="status"></p>

      <div class="course-dialog-actions">
        <button type="button" data-cancel>Cancel</button>
        <button class="course-primary-button" type="submit">Save course</button>
      </div>
    </form>
  `;

  const heading = dialog.querySelector("h2");
  const form = dialog.querySelector("form");
  const codeInput = form.elements.namedItem("code");
  const nameInput = form.elements.namedItem("name");
  const typeInput = form.elements.namedItem("type");
  const semesterInput = form.elements.namedItem("semester");
  const status = form.querySelector('[role="status"]');
  const iconButton = form.querySelector("[data-change-icon]");
  const iconPreview = form.querySelector("[data-icon-preview]");
  const iconLabel = form.querySelector("[data-icon-label]");

  let iconChoice = "";

  semesterInput.value = semester === "previous" ? "previous" : "current";

  function showIcon() {
    iconPreview.replaceChildren(createCourseIcon(codeInput.value, iconChoice));
    iconLabel.textContent = getCourseIconLabel(iconChoice);
  }

  showIcon();
  codeInput.addEventListener("input", showIcon);

  iconButton.addEventListener("click", () => {
    openCourseIconPicker(iconButton, {
      code: codeInput.value,
      name: nameInput.value.trim(),
      choice: iconChoice,
      onUse(id) {
        iconChoice = id;
        showIcon();
      },
    });
  });

  form.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());

  form.addEventListener("input", () => {
    status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const course = {
      code: normalizeCourseCode(codeInput.value),
      name: nameInput.value.trim(),
      type: typeInput.value,
      semester: semesterInput.value,
    };

    if (!course.code || !course.name) {
      status.textContent = "Enter a course code and name.";
      (course.code ? nameInput : codeInput).focus();
      return;
    }

    try {
      if (!saveCustomCourse(course, catalog)) {
        status.textContent = "A course with this code already exists.";
        codeInput.focus();
        return;
      }
    } catch (error) {
      console.error("Could not save course.", error);
      status.textContent = "Couldn’t save the course. Your entries are still here.";
      return;
    }

    let iconSaved = true;

    if (iconChoice) {
      try {
        saveCourseIconChoice(course.code, iconChoice);
      } catch (error) {
        console.error("Could not save course icon.", error);
        iconSaved = false;
      }
    }

    onSaved(course);
    heading.textContent = "Course saved";

    const message = document.createElement("p");
    message.textContent = `${course.code} · ${course.name}`;

    const feedback = document.createElement("p");
    feedback.setAttribute("role", "status");
    feedback.textContent = iconSaved
      ? ""
      : "The course was saved. You can retry saving its icon from the course card.";

    const actions = document.createElement("div");
    actions.className = "course-dialog-actions";

    const done = document.createElement("button");
    done.type = "button";
    done.className = "course-primary-button";
    done.textContent = "Done";
    done.addEventListener("click", () => dialog.close());

    actions.append(done);
    form.replaceWith(message, feedback, actions);
    done.focus();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
}