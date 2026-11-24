import { loadCourseCatalog } from "../../services/course-catalog.js";
import { createCourseCard } from "./course-card.js";
import { openAddCourse } from "./course-editor.js";
import { createCourseFilters } from "./course-filters.js";

const stylesUrl = new URL("../../styles/courses.css", import.meta.url);

function loadCourseStyles() {
  if (document.querySelector("link[data-courses-styles]")) return;

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = stylesUrl.href;
  stylesheet.dataset.coursesStyles = "";
  document.head.append(stylesheet);
}

export async function renderCourses(container) {
  loadCourseStyles();

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

  function showCourses() {
    const visible = filters.apply(courses);
    grid.replaceChildren(...visible.map(createCourseCard));

    if (visible.length === 0) {
      status.textContent = "No courses match these filters.";
      return;
    }

    const label = visible.length === 1 ? "course" : "courses";
    status.textContent = `${visible.length} ${label} shown`;
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
}