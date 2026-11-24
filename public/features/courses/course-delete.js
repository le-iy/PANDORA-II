import {
  hideCourse,
  normalizeCourseCode,
} from "../../services/course-catalog.js";
import { loadResourceCatalog } from "../../services/resource-catalog.js";
import { workspaceSections } from "./course-workspace-data.js";

async function countLinkedItems(courseCode) {
  return Promise.allSettled(workspaceSections.map(async (section) => {
    let incomplete = false;
    const items = section.id === "resources"
      ? await loadResourceCatalog({ onPdfError: () => { incomplete = true; } })
      : await section.load();

    const count = items.filter(
      (item) => normalizeCourseCode(item?.courseCode) === courseCode,
    ).length;

    return { label: section.label, count, incomplete };
  }));
}

export function openDeleteCourse(workspace, trigger, course) {
  const dialog = document.createElement("dialog");
  dialog.className = "header-search-dialog";
  dialog.setAttribute("aria-labelledby", "course-delete-heading");
  dialog.setAttribute("aria-describedby", "course-delete-item course-delete-message");

  dialog.innerHTML = `
    <header class="search-dialog-heading">
      <h2 id="course-delete-heading">Checking linked items…</h2>
    </header>
    <p id="course-delete-item"></p>
    <p id="course-delete-message"></p>
    <ul data-counts hidden></ul>
    <p data-error role="status"></p>
    <div class="course-detail-navigation">
      <button class="course-detail-shortcut" type="button" data-cancel autofocus>
        Cancel
      </button>
      <button class="course-detail-shortcut" type="button" data-action hidden></button>
    </div>
  `;

  const heading = dialog.querySelector("h2");
  const message = dialog.querySelector("#course-delete-message");
  const counts = dialog.querySelector("[data-counts]");
  const cancel = dialog.querySelector("[data-cancel]");
  const action = dialog.querySelector("[data-action]");
  const errorMessage = dialog.querySelector("[data-error]");
  let confirming = false;

  dialog.querySelector("#course-delete-item").textContent =
    `${course.name} · ${course.code}`;

  function showConfirmation() {
    confirming = true;
    heading.textContent = "Delete this course?";
    message.textContent =
      "This removes the course card and workspace. Any linked tasks, quizzes, " +
      "files, and links stay in your study library.";
    counts.hidden = true;
    action.textContent = "Delete course";
    action.style.color = "var(--color-danger)";
    action.hidden = false;
    cancel.focus();
  }

  cancel.addEventListener("click", () => dialog.close());

  action.addEventListener("click", () => {
    if (!confirming) {
      showConfirmation();
      return;
    }

    try {
      hideCourse(course.code);
    } catch (error) {
      console.error("Could not remove course.", error);
      errorMessage.textContent = "Couldn’t remove the course. Try again.";
      return;
    }

    dialog.close();
    window.location.hash = "#/courses";
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  workspace.append(dialog);
  dialog.showModal();

  countLinkedItems(course.code).then((results) => {
    if (!dialog.open || !dialog.isConnected) return;

    const incomplete = results.some(
      (result) => result.status === "rejected" || result.value.incomplete,
    );
    const hasItems = results.some(
      (result) => result.status === "fulfilled" && result.value.count > 0,
    );

    if (!incomplete && !hasItems) {
      showConfirmation();
      return;
    }

    heading.textContent = hasItems
      ? "This course still has linked items"
      : "Some linked items couldn’t be checked";

    message.textContent = incomplete
      ? "Some counts are unavailable. Any linked items will stay in your study library."
      : "These items will stay in Tasks, Quizzes, and Repositories.";

    for (const [index, result] of results.entries()) {
      const item = document.createElement("li");
      const label = workspaceSections[index].label;

      item.textContent = result.status === "rejected"
        ? `${label}: unavailable`
        : `${label}: ${result.value.count}${result.value.incomplete ? "+" : ""}`;

      counts.append(item);
    }

    counts.hidden = false;
    action.textContent = "Continue";
    action.hidden = false;
  });
}