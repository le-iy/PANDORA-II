import { loadCourseCatalog } from "../../services/course-catalog.js";
import {
  getQuizState,
  loadQuizHistory,
  loadQuizzes,
} from "../../services/quiz-catalog.js";

import {
  loadResourceCatalog,
  resolveResourceUrl,
  resourceTypeLabel,
} from "../../services/resource-catalog.js";

import { showHomeRows } from "./home-rows.js";

const quizStatusLabels = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Completed",
};

function wireTabs(panel) {
  const tabs = Array.from(panel.querySelectorAll('[role="tab"]'));

  function selectTab(active) {
    for (const tab of tabs) {
      const selected = tab === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;

      const content = panel.querySelector(`#${tab.getAttribute("aria-controls")}`);
      content.hidden = !selected;
    }
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => selectTab(tab));

    tab.addEventListener("keydown", (event) => {
      const destinations = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };

      if (!Object.hasOwn(destinations, event.key)) return;

      event.preventDefault();
      const next = tabs[destinations[event.key]];
      selectTab(next);
      next.focus();
    });
  }
}

async function showCourses(list, count) {
  try {
    const courses = await loadCourseCatalog();
    count.textContent = String(courses.length);

    const rows = courses.map((course) => ({
      title: course.name,
      detail: course.code,
      href: `#/courses/${encodeURIComponent(course.code)}`,
    }));

    showHomeRows(list, rows, "No courses yet.");
  } catch (error) {
    console.error("Could not load courses.", error);
    count.textContent = "—";
    showHomeRows(list, [], "Couldn’t load courses.");
  }
}

async function showResources(list) {
  try {
    const resources = await loadResourceCatalog();

    const rows = resources.map((resource) => ({
      title: resource.title,
      detail: [resource.courseCode, resourceTypeLabel(resource)]
        .filter(Boolean).join(" · "),
      href: resolveResourceUrl(resource.url)?.href,
      newTab: true,
    }));

    showHomeRows(list, rows, "No resources yet.");
  } catch (error) {
    console.error("Could not load resources.", error);
    showHomeRows(list, [], "Couldn’t load resources.");
  }
}

async function showQuizzes(list) {
  try {
    const quizzes = await loadQuizzes();
    const history = loadQuizHistory();

    const entries = quizzes
      .filter((quiz) => quiz.questions.length > 0)
      .map((quiz) => ({ quiz, state: getQuizState(quiz, history) }));

    // Put resumable sessions first so they are visible in the short Home list.
    entries.sort((a, b) =>
      Number(b.state.status === "in-progress") -
      Number(a.state.status === "in-progress"),
    );

    const rows = entries.slice(0, 5).map(({ quiz, state }) => {
      const count = quiz.questions.length;
      const progress = state.draft
        ? `${state.draft.answers.filter((answer) => answer !== null).length}/${count} answered`
        : "";

      return {
        title: quiz.title,
        detail: [quiz.courseCode, quizStatusLabels[state.status], progress]
          .filter(Boolean).join(" · "),
        href: quiz.id == null ? "#/quizzes" : `#/quizzes/${encodeURIComponent(quiz.id)}`,
      };
    });

    showHomeRows(list, rows, "No quizzes yet.");
  } catch (error) {
    console.error("Could not load quizzes.", error);
    showHomeRows(list, [], "Couldn’t load quizzes.");
  }
}

export function renderHomeLibrary(dashboard) {
  wireTabs(dashboard.querySelector(".home-library"));

  showCourses(
    dashboard.querySelector("[data-course-list]"),
    dashboard.querySelector("[data-course-count]"),
  );
  showResources(dashboard.querySelector("[data-resource-list]"));
  showQuizzes(dashboard.querySelector("[data-quiz-list]"));
}