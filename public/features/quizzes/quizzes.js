import {
  loadCourseCatalog,
  normalizeCourseCode,
} from "../../services/course-catalog.js";
import { getExperience } from "../../services/experience.js";
import {
  getQuizState,
  loadQuizHistory,
  loadQuizzes,
  saveCustomQuiz,
  updateCustomQuiz,
} from "../../services/quiz-catalog.js";

import { renderQuizAttempt } from "./quiz-attempt.js";
import { openQuizHistory, openQuizInstructions } from "./quiz-dialogs.js";
import { renderQuizEditor } from "./quiz-editor.js";
import { openQuizManager } from "./quiz-manage.js";

const pageSize = 6;
const stylesUrl = new URL("../../styles/quiz-dashboard.css", import.meta.url);
const filters = [
  { id: "all", label: "All quizzes" },
  { id: "in-progress", label: "In progress" },
  { id: "not-started", label: "Not started" },
  { id: "completed", label: "Completed" },
];

function loadDashboardStyles() {
  if (document.head.querySelector("[data-quiz-dashboard-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = stylesUrl.href;
  link.dataset.quizDashboardStyles = "";
  document.head.append(link);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createQuizCard(quiz, state, courseName, { onStart, onManage }) {
  const card = element("article", "quiz-card quiz-dashboard-card");
  const metadata = element("div", "quiz-card-metadata");
  const course = element("div", "quiz-card-course");
  course.append(element("p", "quiz-course-code", quiz.courseCode));

  if (courseName) course.append(element("p", "quiz-card-course-name", courseName));

  metadata.append(course, element("span", "quiz-card-reward", `+${quiz.expReward} EXP`));

  const title = element("h2", "quiz-card-title", quiz.title);
  const count = quiz.questions.length;
  const details = element(
    "p",
    "quiz-card-detail",
    `${count} ${count === 1 ? "question" : "questions"}`,
  );
  const stateLabel = filters.find(({ id }) => id === state.status)?.label ?? "Not started";
  const answered = state.draft
    ? state.draft.answers.filter((answer) => answer !== null).length
    : state.status === "completed" ? count : 0;

  const progress = element("progress", "quiz-card-progress");
  progress.max = Math.max(1, count);
  progress.value = Math.min(count, answered);
  progress.setAttribute("aria-label", `Questions answered in ${quiz.title}`);

  const progressInfo = element("div", "quiz-card-progress-info");
  progressInfo.append(
    element("span", "", stateLabel),
    element("span", "", `${Math.min(count, answered)} / ${count} answered`),
  );

  const startLabel = state.draft
    ? "Resume quiz"
    : state.status === "completed" ? "Retake quiz" : "Start quiz";
  const start = element("button", "quiz-dashboard-primary", startLabel);
  start.type = "button";
  start.disabled = count === 0;
  start.setAttribute("aria-haspopup", "dialog");
  start.setAttribute("aria-label", `${startLabel}: ${quiz.title}`);
  start.addEventListener("click", () => {
    openQuizInstructions(quiz, start, () => onStart(quiz, state.draft), state.draft);
  });

  const actions = element("div", "quiz-card-actions");
  actions.append(start);

  if (quiz.source === "custom" && quiz.id != null) {
    const manage = element("button", "", "Manage quiz");
    manage.type = "button";
    manage.setAttribute("aria-label", `Manage quiz: ${quiz.title}`);
    manage.setAttribute("aria-haspopup", "dialog");
    manage.addEventListener("click", () => onManage(quiz, state, manage));
    actions.append(manage);
  }

  card.append(metadata, title, details, progressInfo, progress, actions);
  return card;
}

export async function renderQuizzes(
  container,
  preferredSort = "course",
  quizId = null,
  message = "",
) {
  loadDashboardStyles();

  const linked = quizId !== null;
  const screen = element("section", "quiz-dashboard");

  screen.innerHTML = `
    <header class="quiz-dashboard-heading">
      <h1>Quizzes</h1>
      <div class="quiz-dashboard-actions" ${linked ? "hidden" : ""}>
        <button type="button" class="quiz-dashboard-primary" data-create>+ Create quiz</button>
        <button type="button" data-history aria-haspopup="dialog">Quiz history</button>
      </div>
    </header>

    <p ${linked ? "" : "hidden"}><a href="#/quizzes">View all quizzes</a></p>

    <dl class="quiz-dashboard-summary" aria-label="Quiz overview" ${linked ? "hidden" : ""}>
      <div><dt>Available quizzes</dt><dd data-available>—</dd></div>
      <div><dt>In progress</dt><dd data-in-progress>—</dd></div>
      <div class="quiz-exp-summary">
        <dt>EXP toward the next level</dt>
        <dd data-exp aria-live="polite">Loading EXP…</dd>
        <progress data-exp-progress aria-label="EXP toward the next level" hidden></progress>
      </div>
    </dl>

    <div class="quiz-dashboard-toolbar" ${linked ? "hidden" : ""}>
      <div class="course-filters" role="group" aria-label="Filter quizzes by progress"
        data-filters></div>
      <label>
        Sort by
        <select data-sort disabled>
          <option value="course">Course order</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
    </div>

    <p data-message role="status"></p>
    <p data-results role="status">Loading quizzes…</p>
    <section class="quizzes-grid" aria-label="Available quizzes" tabindex="-1"></section>

    <section class="quiz-dashboard-empty" data-empty hidden>
      <h2>No quizzes yet</h2>
      <button type="button" class="quiz-dashboard-primary" data-empty-create>
        Create your first quiz
      </button>
    </section>

    <nav class="quiz-pagination" aria-label="Quiz pages" data-pagination hidden>
      <button type="button" data-prev>Previous</button>
      <span data-page-label></span>
      <button type="button" data-next>Next</button>
    </nav>
  `;

  const heading = screen.querySelector("h1");
  const create = screen.querySelector("[data-create]");
  const historyButton = screen.querySelector("[data-history]");
  const sort = screen.querySelector("[data-sort]");
  const filterBar = screen.querySelector("[data-filters]");
  const status = screen.querySelector("[data-results]");
  const feedback = screen.querySelector("[data-message]");
  const grid = screen.querySelector(".quizzes-grid");
  const empty = screen.querySelector("[data-empty]");
  const pagination = screen.querySelector("[data-pagination]");
  const previous = screen.querySelector("[data-prev]");
  const next = screen.querySelector("[data-next]");
  const pageLabel = screen.querySelector("[data-page-label]");
  const expLabel = screen.querySelector("[data-exp]");
  const expProgress = screen.querySelector("[data-exp-progress]");
  const buttons = new Map();
  const coursesByCode = new Map();

  let activeFilter = "all";
  let currentPage = 1;
  let quizzes = null;
  let experienceRequest = 0;

  sort.value = preferredSort === "title" ? "title" : "course";
  feedback.textContent = message;

  function focusHeading() {
    heading.tabIndex = -1;
    heading.focus();
  }

  function reload(savedMessage) {
    renderQuizzes(container, sort.value, quizId, savedMessage);
    const nextHeading = container.querySelector("h1");

    if (nextHeading) {
      nextHeading.tabIndex = -1;
      nextHeading.focus();
    }
  }

  async function updateExperience() {
    const request = ++experienceRequest;

    try {
      const experience = await getExperience();
      if (request !== experienceRequest || screen.parentElement !== container) return;

      expLabel.textContent = experience.atCap ? "Level 100 · Maximum level" :
        `${experience.levelExp} / ${experience.expPerLevel} EXP`;
      expProgress.max = experience.expPerLevel;
      expProgress.value = experience.levelExp;
      expProgress.hidden = false;
    } catch (error) {
      console.error("Could not load quiz EXP.", error);
      if (request !== experienceRequest || screen.parentElement !== container) return;
      expLabel.textContent = "EXP unavailable";
      expProgress.hidden = true;
    }
  }

  function manageQuiz(quiz, state, trigger) {
    openQuizManager(quiz, trigger, {
      hasDraft: Boolean(state.draft),

      onEdit() {
        renderQuizEditor(container, {
          quiz,

          onSave(details) {
            if (!updateCustomQuiz(quiz, details)) return false;
            reload("Quiz updated.");
            return true;
          },

          onCancel() {
            container.replaceChildren(screen);
            trigger.focus();
          },
        });
      },

      onRemoved() {
        if (linked) {
          window.location.hash = "#/quizzes";
          return;
        }

        quizzes = quizzes.filter((item) => item.source !== "custom" || item.id !== quiz.id);
        showQuizzes();
        updateExperience();
        feedback.textContent = `Quiz removed: ${quiz.title}`;
        buttons.get(activeFilter)?.focus();
      },
    });
  }

  function makeCard(quiz, state) {
    const course = coursesByCode.get(normalizeCourseCode(quiz.courseCode));

    return createQuizCard(quiz, state, course?.name, {
      onStart(selected, draft) {
        renderQuizAttempt(container, selected, () => {
          if (linked) {
            window.location.hash = "#/quizzes";
            return;
          }

          container.replaceChildren(screen);
          showQuizzes();
          updateExperience();
          buttons.get(activeFilter)?.focus();
        }, draft);
      },

      onManage: manageQuiz,
    });
  }

  function showQuizzes() {
    if (!quizzes) return;

    const history = loadQuizHistory();

    if (linked) {
      const quiz = quizzes.find((item) => item.id != null && String(item.id) === quizId);

      if (!quiz) {
        status.textContent = "Quiz not found. You can still open the full quiz list.";
        return;
      }

      heading.textContent = quiz.title;
      document.title = `${quiz.title} | PANDORA II`;
      status.textContent = "";
      grid.replaceChildren(makeCard(quiz, getQuizState(quiz, history)));
      return;
    }

    const entries = quizzes.map((quiz) => ({ quiz, state: getQuizState(quiz, history) }));
    const totals = {
      all: entries.length,
      "in-progress": 0,
      "not-started": 0,
      completed: 0,
    };

    for (const { state } of entries) totals[state.status] += 1;

    screen.querySelector("[data-available]").textContent = String(totals.all);
    screen.querySelector("[data-in-progress]").textContent = String(totals["in-progress"]);

    for (const { id, label } of filters) {
      const button = buttons.get(id);
      button.textContent = `${label} (${totals[id]})`;
      button.setAttribute("aria-pressed", String(id === activeFilter));
    }

    const visible = entries.filter(
      ({ state }) => activeFilter === "all" || state.status === activeFilter,
    );

    if (sort.value === "title") {
      visible.sort((a, b) =>
        a.quiz.title.localeCompare(b.quiz.title, undefined, { sensitivity: "base" }),
      );
    } else {
      const rank = (code) => coursesByCode.get(code)?.rank ?? Number.MAX_SAFE_INTEGER;

      visible.sort((a, b) => {
        const first = normalizeCourseCode(a.quiz.courseCode);
        const second = normalizeCourseCode(b.quiz.courseCode);
        return rank(first) - rank(second) || first.localeCompare(second);
      });
    }

    const count = visible.length;
    const pages = Math.max(1, Math.ceil(count / pageSize));
    currentPage = Math.min(pages, Math.max(1, currentPage));
    const offset = (currentPage - 1) * pageSize;
    const page = visible.slice(offset, offset + pageSize);

    grid.replaceChildren(...page.map(({ quiz, state }) => makeCard(quiz, state)));
    empty.hidden = entries.length !== 0 || activeFilter !== "all";
    pagination.hidden = pages === 1;
    pageLabel.textContent = `Page ${currentPage} of ${pages}`;
    previous.disabled = currentPage === 1;
    next.disabled = currentPage === pages;

    if (count) {
      status.textContent = `Showing ${offset + 1}–${offset + page.length} of ${count} quizzes`;
    } else {
      status.textContent = empty.hidden ? "No quizzes with this status." : "";
    }
  }

  function openCreateQuiz() {
    renderQuizEditor(container, {
      onSave(quiz) {
        if (!saveCustomQuiz(quiz)) return false;
        reload("Quiz saved.");
        return true;
      },

      onCancel() {
        container.replaceChildren(screen);
        showQuizzes();
        updateExperience();
        create.focus();
      },
    });
  }

  function changePage(offset) {
    currentPage += offset;
    showQuizzes();
    grid.focus();
  }

  if (!linked) {
    for (const { id, label } of filters) {
      const button = element("button", "", label);
      button.type = "button";
      button.disabled = true;

      button.addEventListener("click", () => {
        activeFilter = id;
        currentPage = 1;
        showQuizzes();
      });

      buttons.set(id, button);
      filterBar.append(button);
    }

    historyButton.addEventListener("click", () => openQuizHistory(historyButton));
    create.addEventListener("click", openCreateQuiz);
    screen.querySelector("[data-empty-create]").addEventListener("click", openCreateQuiz);
    previous.addEventListener("click", () => changePage(-1));
    next.addEventListener("click", () => changePage(1));

    sort.addEventListener("change", () => {
      currentPage = 1;
      showQuizzes();
    });
  }

  container.replaceChildren(screen);
  if (!linked) updateExperience();

  try {
    quizzes = await loadQuizzes();
  } catch (error) {
    console.error("Could not load quizzes.", error);
    status.textContent = "Couldn’t load quizzes. Try refreshing the page.";
    return;
  }

  if (screen.parentElement !== container) return;

  if (!linked) {
    sort.disabled = false;
    for (const button of buttons.values()) button.disabled = false;
  }

  showQuizzes();
  if (linked) return;

  try {
    const courses = await loadCourseCatalog();

    for (const [rank, course] of courses.entries()) {
      coursesByCode.set(normalizeCourseCode(course.code), { name: course.name, rank });
    }

    if (screen.parentElement !== container) return;

    const focusWasInGrid = grid.contains(document.activeElement);
    showQuizzes();
    if (focusWasInGrid) focusHeading();
  } catch (error) {
    console.error("Could not load course details for quizzes.", error);
  }
}