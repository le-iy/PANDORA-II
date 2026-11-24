import { renderHomeCalendar } from "./home-calendar.js";
import { renderHomeTasks } from "./home-tasks.js";
import { renderHomeLibrary } from "./home-library.js";
import { renderHomeLevel } from "./home-level.js";

const iconDirectory = new URL("../../assets/icons/gamification/", import.meta.url);

export function renderHome(container) {
  const dashboard = document.createElement("section");
  dashboard.className = "home-dashboard";
  dashboard.setAttribute("aria-labelledby", "home-heading");

  dashboard.innerHTML = `
    <h1 id="home-heading" class="home-title">Home</h1>

    <section class="home-stats" aria-label="Study overview">
      <a class="home-stat" data-tone="pink" href="#/tasks">
        <span>Tasks Due</span>
        <strong data-open-count>…</strong>
        <img src="${new URL("tasks-due.svg", iconDirectory)}" alt="">
      </a>
      <a class="home-stat" data-tone="mint" href="#/tasks">
        <span>Tasks Finished</span>
        <strong data-finished-count>…</strong>
        <img src="${new URL("tasks-finished.svg", iconDirectory)}" alt="">
      </a>
      <a class="home-stat" data-tone="lavender" href="#/courses">
        <span>Total Courses</span>
        <strong data-course-count>…</strong>
        <img src="${new URL("course-books.svg", iconDirectory)}" alt="">
      </a>
    </section>

    <section class="home-panel home-library" aria-label="Courses and resources">
      <div class="home-tabs" role="tablist" aria-label="Library views">
        <button type="button" id="home-subjects-tab" role="tab"
          aria-selected="true" aria-controls="home-subjects-panel">Subjects</button>
        <button type="button" id="home-repo-tab" role="tab" tabindex="-1"
          aria-selected="false" aria-controls="home-repo-panel">Repo</button>
      </div>

      <div id="home-subjects-panel" role="tabpanel" aria-labelledby="home-subjects-tab">
        <ul class="home-data-list" data-course-list><li>Loading courses…</li></ul>
        <a href="#/courses">View courses</a>
      </div>

      <div id="home-repo-panel" role="tabpanel" aria-labelledby="home-repo-tab" hidden>
        <ul class="home-data-list" data-resource-list><li>Loading resources…</li></ul>
        <a href="#/repositories">Open Repositories</a>
      </div>
    </section>

    <div class="home-study">
      <section class="home-panel home-exp" data-exp-panel aria-labelledby="home-exp-heading">
        <h2 id="home-exp-heading">Level Progress</h2>
        <div class="home-exp-summary">
          <strong data-level></strong>
          <span data-exp-total></span>
        </div>
        <progress aria-label="EXP progress toward the next level" hidden></progress>
        <p role="status">Loading EXP…</p>
      </section>

      <section class="home-panel home-quizzes" aria-labelledby="home-quiz-heading">
        <h2 id="home-quiz-heading">Available Quizzes</h2>
        <ul class="home-data-list" data-quiz-list><li>Loading quizzes…</li></ul>
        <a href="#/quizzes">View quizzes</a>
      </section>
    </div>

    <div class="home-planner">
      <section class="home-panel home-calendar" aria-label="Calendar and agenda">
        <div class="home-calendar-header">
          <h2 data-calendar-month aria-live="polite"></h2>
          <div class="home-calendar-controls">
            <button type="button" data-month-offset="-1" aria-label="Previous month">‹</button>
            <button type="button" data-month-offset="1" aria-label="Next month">›</button>
          </div>
        </div>

        <div class="home-calendar-grid home-weekdays" data-calendar-weekdays
          aria-hidden="true"></div>
        <div class="home-calendar-grid" data-calendar-days></div>

        <h3 data-agenda-heading></h3>
        <ul class="home-data-list" data-agenda-list></ul>
        <a href="#/schedule">Open Schedule</a>
      </section>

      <section class="home-panel home-tasks" aria-labelledby="home-task-heading">
        <h2 id="home-task-heading">To-do List</h2>
        <ul class="home-data-list" data-task-list></ul>
        <a href="#/tasks">View tasks</a>
      </section>
    </div>
  `;

  container.replaceChildren(dashboard);

  const today = new Date();
  renderHomeCalendar(dashboard.querySelector(".home-calendar"), today);
  renderHomeTasks(dashboard, today);
  renderHomeLibrary(dashboard);
  renderHomeLevel(dashboard.querySelector("[data-exp-panel]"));
}