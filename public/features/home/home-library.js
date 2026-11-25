import { themeAsset as homeQuizThemeAsset } from "../../services/theme-packs.js";
import { createCourseIcon } from "../courses/course-icon.js";
import { createResourceIcon } from "../repositories/resource-icon.js";
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
      panel.querySelector(`#${tab.getAttribute("aria-controls")}`).hidden = !selected;
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
      icon: createCourseIcon(course.code),
    }));

    showHomeRows(list, rows, "No courses yet.");
  } catch (error) {
    console.error("Could not load courses.", error);
    count.textContent = "—";
    showHomeRows(list, [], "Couldn’t load courses.");
  }
}

async function showResources(list) {
  let partial = false;

  try {
    const resources = await loadResourceCatalog({
      onPdfError() {
        partial = true;
      },
    });

    const rows = resources.map((resource) => ({
      title: resource.title,
      detail: [resource.courseCode, resourceTypeLabel(resource)]
        .filter(Boolean).join(" · "),
      href: resolveResourceUrl(resource.url)?.href,
      newTab: true,
      icon: createResourceIcon(resource),
    }));

    showHomeRows(list, rows, partial ? "Couldn’t load uploaded PDFs." : "No resources yet.");

    if (partial && rows.length > 0) {
      const notice = document.createElement("li");
      notice.className = "home-empty";
      notice.textContent = "Uploaded PDFs couldn’t be loaded.";
      list.append(notice);
    }
  } catch (error) {
    console.error("Could not load resources.", error);
    showHomeRows(list, [], "Couldn’t load resources.");
  }
}

function createHomeQuizIcon() {
  const icon = document.createElement("img");
  icon.className = "home-row-icon";
  icon.alt = "";
  icon.src = homeQuizThemeAsset("icons/navigation/quizzes-tab.svg");
  return icon;
}

async function showQuizzes(list) {
  try {
    const quizzes = await loadQuizzes();
    const history = loadQuizHistory();

    const entries = quizzes
      .filter((quiz) => quiz.questions.length > 0)
      .map((quiz) => ({ quiz, state: getQuizState(quiz, history) }));

    entries.sort((a, b) =>
      Number(b.state.status === "in-progress") -
      Number(a.state.status === "in-progress"),
    );

    const rows = entries.slice(0, 5).map(({ quiz, state }) => {
      const answered = state.draft?.answers.filter((answer) => answer !== null).length;
      const progress = state.draft
        ? `${answered}/${quiz.questions.length} answered`
        : "";

      return {
        title: quiz.title,
        detail: [quiz.courseCode, progress].filter(Boolean).join(" · "),
        badge: quizStatusLabels[state.status],
        state: state.status,
        icon: createHomeQuizIcon(),
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