import {
  loadCourseCatalog,
  normalizeCourseCode,
} from "../../services/course-catalog.js";

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

const filters = [
  { id: "all", label: "All quizzes" },
  { id: "not-started", label: "Not started" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function createQuizCard(quiz, state, { onStart, onManage }) {
  const card = document.createElement("article");
  card.className = "quiz-card";

  const code = document.createElement("p");
  code.className = "quiz-course-code";
  code.textContent = quiz.courseCode;

  const title = document.createElement("h2");
  title.textContent = quiz.title;

  const details = document.createElement("p");
  const count = quiz.questions.length;
  details.textContent =
    `${count} ${count === 1 ? "question" : "questions"} · +${quiz.expReward} EXP`;

  const progress = document.createElement("p");
  progress.textContent = filters.find(({ id }) => id === state.status).label;

  if (state.draft) {
    const answered = state.draft.answers.filter((answer) => answer !== null).length;
    progress.textContent += ` · ${answered}/${count} answered`;
  }

  const start = document.createElement("button");
  start.type = "button";
  start.disabled = count === 0;
  start.setAttribute("aria-haspopup", "dialog");
  start.textContent = state.draft
    ? "Resume quiz"
    : state.status === "completed" ? "Retake quiz" : "Start quiz";

  start.addEventListener("click", () => {
    openQuizInstructions(quiz, start, () => onStart(quiz, state.draft), state.draft);
  });

  card.append(code, title, details, progress, start);

  if (quiz.source === "custom" && quiz.id != null) {
    const manage = document.createElement("button");
    manage.type = "button";
    manage.textContent = "Manage quiz";
    manage.setAttribute("aria-label", `Manage quiz: ${quiz.title}`);
    manage.setAttribute("aria-haspopup", "dialog");
    manage.addEventListener("click", () => onManage(quiz, state, manage));
    card.append(manage);
  }

  return card;
}

export async function renderQuizzes(
  container,
  preferredSort = "course",
  quizId = null,
  message = "",
) {
  const linked = quizId !== null;
  const screen = document.createElement("section");

  screen.innerHTML = `
    <h1>Quizzes</h1>

    <p data-back ${linked ? "" : "hidden"}><a href="#/quizzes">View all quizzes</a></p>

    <div class="course-filters" ${linked ? "hidden" : ""} data-toolbar>
      <button type="button" data-create>+ Create quiz</button>
      <button type="button" data-history aria-haspopup="dialog">Quiz history</button>

      <label>
        Sort by
        <select data-sort disabled>
          <option value="course">Course order</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
    </div>

    <div class="course-filters" role="group" aria-label="Filter quizzes by progress"
      ${linked ? "hidden" : ""} data-filters></div>

    <p data-message role="status"></p>
    <p data-results role="status">Loading quizzes…</p>
    <section class="quizzes-grid" aria-label="Available quizzes"></section>
  `;

  for (const element of screen.querySelectorAll("[hidden]")) {
    element.style.display = "none";
  }

  const heading = screen.querySelector("h1");
  const create = screen.querySelector("[data-create]");
  const historyButton = screen.querySelector("[data-history]");
  const sort = screen.querySelector("[data-sort]");
  const filterBar = screen.querySelector("[data-filters]");
  const status = screen.querySelector("[data-results]");
  const feedback = screen.querySelector("[data-message]");
  const grid = screen.querySelector(".quizzes-grid");

  sort.value = preferredSort === "title" ? "title" : "course";
  feedback.textContent = message;

  let activeFilter = "all";
  let quizzes = null;
  const buttons = new Map();
  const courseRanks = new Map();

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
        feedback.textContent = `Quiz removed: ${quiz.title}`;
        buttons.get(activeFilter)?.focus();
      },
    });
  }

  function makeCard(quiz, state) {
    return createQuizCard(quiz, state, {
      onStart(selected, draft) {
        renderQuizAttempt(container, selected, () => {
          if (linked) {
            window.location.hash = "#/quizzes";
            return;
          }

          container.replaceChildren(screen);
          showQuizzes();
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

    for (const filter of filters) {
      const button = buttons.get(filter.id);
      const count = filter.id === "all"
        ? entries.length
        : entries.filter(({ state }) => state.status === filter.id).length;

      button.textContent = `${filter.label} (${count})`;
      button.setAttribute("aria-pressed", String(filter.id === activeFilter));
    }

    const visible = entries.filter(
      ({ state }) => activeFilter === "all" || state.status === activeFilter,
    );

    if (sort.value === "title") {
      visible.sort((a, b) =>
        a.quiz.title.localeCompare(b.quiz.title, undefined, { sensitivity: "base" }),
      );
    } else {
      const rank = (code) => courseRanks.get(code) ?? Number.MAX_SAFE_INTEGER;

      visible.sort((a, b) => {
        const first = normalizeCourseCode(a.quiz.courseCode);
        const second = normalizeCourseCode(b.quiz.courseCode);
        return rank(first) - rank(second) || first.localeCompare(second);
      });
    }

    grid.replaceChildren(...visible.map(({ quiz, state }) => makeCard(quiz, state)));

    const count = visible.length;

    if (count > 0) {
      status.textContent = `${count} ${count === 1 ? "quiz" : "quizzes"} shown`;
    } else {
      status.textContent = activeFilter === "all"
        ? "No quizzes yet."
        : "No quizzes with this status.";
    }
  }

  if (!linked) {
    for (const filter of filters) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = filter.label;
      button.disabled = true;

      button.addEventListener("click", () => {
        activeFilter = filter.id;
        showQuizzes();
      });

      buttons.set(filter.id, button);
      filterBar.append(button);
    }

    historyButton.addEventListener("click", () => openQuizHistory(historyButton));
    sort.addEventListener("change", showQuizzes);

    create.addEventListener("click", () => {
      renderQuizEditor(container, {
        onSave(quiz) {
          if (!saveCustomQuiz(quiz)) return false;
          reload("Quiz saved.");
          return true;
        },

        onCancel() {
          container.replaceChildren(screen);
          showQuizzes();
          create.focus();
        },
      });
    });
  }

  container.replaceChildren(screen);

  try {
    quizzes = await loadQuizzes();
  } catch (error) {
    console.error("Could not load quizzes.", error);
    status.textContent = "Couldn’t load quizzes. Try refreshing the page.";
    return;
  }

  if (!linked) {
    sort.disabled = false;
    for (const button of buttons.values()) button.disabled = false;
  }

  if (linked && screen.parentElement !== container) return;

  showQuizzes();

  if (linked) return;

  try {
    const courses = await loadCourseCatalog();

    for (const [index, course] of courses.entries()) {
      courseRanks.set(normalizeCourseCode(course.code), index);
    }

    if (screen.parentElement === container && sort.value === "course") {
      const active = document.activeElement;
      const focusWasInGrid = grid.contains(active);
      showQuizzes();
      if (focusWasInGrid) focusHeading();
    }
  } catch (error) {
    console.error("Could not load course order for quizzes.", error);
  }
}