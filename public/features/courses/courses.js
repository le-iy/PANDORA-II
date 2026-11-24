import { loadCourseCatalog } from "../../services/course-catalog.js";
import { createCourseCard } from "./course-card.js";
import { loadCourseCounts } from "./course-counts.js";
import { openAddCourse } from "./course-editor.js";
import { createCourseFilters } from "./course-filters.js";
import { countRemovedCourses, openRemovedCourses } from "./course-restore.js";

export async function renderCourses(container) {
  const screen = document.createElement("section");
  screen.className = "courses-screen";

  screen.innerHTML = `
    <div class="courses-heading">
      <h1>Courses</h1>
      <div class="course-dialog-actions">
        <button class="course-primary-button" type="button"
          data-removed-courses aria-haspopup="dialog">Removed courses</button>
        <button class="course-primary-button" type="button"
          data-add-course aria-haspopup="dialog" disabled>+ Add course</button>
      </div>
    </div>

    <div class="courses-toolbar" hidden>
      <div class="course-filters" role="group" aria-label="Filter by class type"></div>

      <label class="courses-semester">
        Semester
        <select>
          <option value="current">Current semester</option>
          <option value="previous">Previous semester</option>
          <option value="all">All semesters</option>
        </select>
      </label>
    </div>

    <p class="course-results" role="status">Loading courses…</p>
    <section class="courses-grid" aria-label="Course list"></section>
  `;

  const add = screen.querySelector("[data-add-course]");
  const removed = screen.querySelector("[data-removed-courses]");
  const toolbar = screen.querySelector(".courses-toolbar");
  const typeBar = toolbar.querySelector(".course-filters");
  const semesterSelect = toolbar.querySelector("select");
  const status = screen.querySelector('[role="status"]');
  const grid = screen.querySelector(".courses-grid");

  removed.style.background = "var(--color-surface)";
  removed.style.color = "var(--color-text)";
  removed.style.borderColor = "var(--color-border)";

  let courses;
  let filters;
  let countForCourse = null;
  let visibleCards = [];

  function updateRemovedCount() {
    try {
      const count = countRemovedCourses();
      removed.textContent = count ? `Removed courses (${count})` : "Removed courses";
    } catch (error) {
      console.error("Could not count removed courses.", error);
      removed.textContent = "Removed courses";
    }
  }

  function showCourses() {
    const visible = filters.apply(courses);

    visibleCards = visible.map((course) => ({
      code: course.code,
      card: createCourseCard(course, countForCourse?.(course.code)),
    }));

    grid.replaceChildren(...visibleCards.map(({ card }) => card.element));

    const count = visible.length;
    status.textContent = count
      ? `${count} ${count === 1 ? "course" : "courses"} shown`
      : "No courses match these filters.";
  }

  function initializeCourses(catalog) {
    courses = catalog;
    filters ??= createCourseFilters(typeBar, semesterSelect, showCourses);
    add.disabled = false;
    toolbar.hidden = false;
  }

  removed.addEventListener("click", () => {
    openRemovedCourses(screen, removed, (catalog, restored) => {
      if (screen.parentElement !== container) return;

      initializeCourses(catalog);
      if (restored) filters.revealCourse(restored);
      showCourses();
      updateRemovedCount();

      if (restored) status.textContent = `${restored.name} restored.`;
    });
  });

  add.addEventListener("click", () => {
    openAddCourse(screen, add, courses, (course) => {
      courses.push(course);
      filters.revealCourse(course);
      showCourses();
    }, filters.semester);
  });

  container.replaceChildren(screen);
  updateRemovedCount();

  const pendingCounts = loadCourseCounts().catch((error) => {
    console.error("Could not load course activity counts.", error);
    return () => ({ tasks: null, quizzes: null });
  });

  try {
    const catalog = await loadCourseCatalog();
    if (screen.parentElement !== container) return;

    initializeCourses(catalog);
    showCourses();
  } catch (error) {
    console.error("Could not load courses.", error);

    if (screen.parentElement === container) {
      status.textContent = "Couldn’t load courses. Try refreshing the page.";
    }
  }

  countForCourse = await pendingCounts;
  if (screen.parentElement !== container) return;

  for (const { code, card } of visibleCards) {
    card.updateCounts(countForCourse(code));
  }
}