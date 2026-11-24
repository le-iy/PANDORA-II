import {
  loadCourseCatalog,
  normalizeCourseCode,
} from "../../services/course-catalog.js";

const hiddenKey = "pandora-ii.hidden-courses";
const customKey = "pandora-ii.custom-courses";
const namesKey = "pandora-ii.course-names";
const bundledUrl = new URL("../../data/courses.json", import.meta.url);

function readList(key) {
  const value = JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!Array.isArray(value)) throw new Error("Invalid saved course list.");
  return value;
}

function readRemovedCodes() {
  return [...new Set(readList(hiddenKey).map(normalizeCourseCode).filter(Boolean))];
}

export function countRemovedCourses() {
  return readRemovedCodes().length;
}

async function loadRemovedCourses() {
  const codes = readRemovedCodes();
  if (!codes.length) return [];

  const catalog = new Map();
  let incomplete = false;

  function addCourses(courses) {
    for (const course of courses) {
      const code = normalizeCourseCode(course?.code);
      if (code && !catalog.has(code)) catalog.set(code, course.name);
    }
  }

  try {
    const response = await fetch(bundledUrl);
    if (!response.ok) throw new Error(`Could not load courses (${response.status}).`);
    const courses = await response.json();
    if (!Array.isArray(courses)) throw new Error("Invalid course list.");
    addCourses(courses);
  } catch (error) {
    console.error("Could not load bundled course names.", error);
    incomplete = true;
  }

  try {
    addCourses(readList(customKey));
  } catch (error) {
    console.error("Could not load custom course names.", error);
    incomplete = true;
  }

  let names = new Map();

  try {
    const saved = JSON.parse(localStorage.getItem(namesKey) ?? "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      names = new Map(Object.entries(saved));
    }
  } catch (error) {
    console.error("Could not load saved course names.", error);
    incomplete = true;
  }

  return codes.map((code) => {
    const savedName = names.get(code);
    const name = typeof savedName === "string" && savedName.trim()
      ? savedName.trim()
      : catalog.get(code) || code;

    return { code, name, incomplete };
  });
}

function restoreCourse(code) {
  const codes = readRemovedCodes();
  if (!codes.includes(code)) return false;

  localStorage.setItem(
    hiddenKey,
    JSON.stringify(codes.filter((item) => item !== code)),
  );

  return true;
}

export function openRemovedCourses(screen, trigger, onRestored) {
  const dialog = document.createElement("dialog");
  dialog.className = "course-dialog";
  dialog.setAttribute("aria-labelledby", "removed-courses-heading");

  dialog.innerHTML = `
    <h2 id="removed-courses-heading">Removed courses</h2>
    <p>Restore a course to bring back its card and workspace.</p>
    <p class="course-feedback" role="status">Loading removed courses…</p>
    <ul data-removed-list></ul>
    <div class="course-dialog-actions">
      <button type="button" data-close autofocus>Close</button>
    </div>
  `;

  const list = dialog.querySelector("[data-removed-list]");
  const status = dialog.querySelector('[role="status"]');
  const close = dialog.querySelector("[data-close]");
  let busy = false;

  Object.assign(list.style, {
    display: "grid",
    gap: "8px",
    listStyle: "none",
    padding: "0",
  });

  close.addEventListener("click", () => {
    if (!busy) dialog.close();
  });

  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  async function showRemoved() {
    try {
      const courses = await loadRemovedCourses();
      if (!dialog.open) return;

      status.textContent = courses.length
        ? courses.some(({ incomplete }) => incomplete)
          ? "Some course names couldn’t be loaded."
          : ""
        : "No removed courses.";

      list.replaceChildren(...courses.map(createRow));
    } catch (error) {
      console.error("Could not load removed courses.", error);
      status.textContent = "Couldn’t load removed courses.";
    }
  }

  function createRow(course) {
    const row = document.createElement("li");
    row.className = "course-dialog-actions";
    row.style.justifyContent = "space-between";

    const identity = document.createElement("span");
    identity.textContent = course.name === course.code
      ? course.code
      : `${course.name} · ${course.code}`;

    const restore = document.createElement("button");
    restore.type = "button";
    restore.textContent = "Restore";
    restore.setAttribute("aria-label", `Restore ${course.name}`);

    restore.addEventListener("click", async () => {
      if (busy) return;

      busy = true;
      close.disabled = true;
      restore.disabled = true;
      status.textContent = "Restoring course…";

      let restored = false;

      try {
        restored = restoreCourse(course.code);
      } catch (error) {
        console.error("Could not restore course.", error);
        status.textContent = "Couldn’t restore this course. Try again.";
        busy = false;
        close.disabled = false;
        restore.disabled = false;
        restore.focus();
        return;
      }

      try {
        const catalog = await loadCourseCatalog();
        const activeCourse = catalog.find(({ code }) => code === course.code);
        onRestored(catalog, activeCourse);
      } catch (error) {
        console.error("Could not refresh courses after restore.", error);
        row.remove();
        status.textContent = restored
          ? "Course restored. Refresh the page to update the list."
          : "This course is no longer in Removed courses. Refresh the page.";
        busy = false;
        close.disabled = false;
        close.focus();
        return;
      }

      busy = false;
      close.disabled = false;

      if (restored) {
        dialog.close();
      } else {
        await showRemoved();
        close.focus();
      }
    });

    row.append(identity, restore);
    return row;
  }

  screen.append(dialog);
  dialog.showModal();
  showRemoved();
}