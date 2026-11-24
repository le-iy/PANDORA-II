import { loadCourseCatalog } from "../../services/course-catalog.js";
import { createCourseCard } from "./course-card.js";
import { loadCourseCounts } from "./course-counts.js";
import { openAddCourse } from "./course-editor.js";
import { createCourseFilters } from "./course-filters.js";

export async function renderCourses(container) {
  const screen = document.createElement("section");
  screen.className = "courses-screen";

  screen.innerHTML = `
    <div class="courses-heading">
      <h1>Courses</h1>
      <button class="course-primary-button" type="button"
        data-add-course aria-haspopup="dialog" disabled>+ Add course</button>
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
  const toolbar = screen.querySelector(".courses-toolbar");
  const typeBar = toolbar.querySelector(".course-filters");
  const semesterSelect = toolbar.querySelector("select");
  const status = screen.querySelector('[role="status"]');
  const grid = screen.querySelector(".courses-grid");

  container.replaceChildren(screen);

  const pendingCounts = loadCourseCounts();
  let courses;

  try {
    courses = await loadCourseCatalog();
  } catch (error) {
    console.error("Could not load courses.", error);

    if (screen.parentElement === container) {
      status.textContent = "Couldn’t load courses. Try refreshing the page.";
    }

    return;
  }

  if (screen.parentElement !== container) return;

  const filters = createCourseFilters(typeBar, semesterSelect, showCourses);

  let countForCourse = null;
  let visibleCards = [];

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

  add.addEventListener("click", () => {
    openAddCourse(screen, add, courses, (course) => {
      courses.push(course);
      filters.revealCourse(course);
      showCourses();
    }, filters.semester);
  });

  add.disabled = false;
  toolbar.hidden = false;
  showCourses();

  countForCourse = await pendingCounts;

  if (screen.parentElement !== container) return;

  // Update the text without replacing a card the user might be focused on.
  for (const { code, card } of visibleCards) {
    card.updateCounts(countForCourse(code));
  }
}