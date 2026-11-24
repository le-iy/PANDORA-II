import { themeAsset } from "../../services/theme-packs.js";
import { loadQuizHistory } from "../../services/quiz-catalog.js";
import { loadCourseCatalog, normalizeCourseCode } from "../../services/course-catalog.js";
import { createCourseIcon } from "../courses/course-icon.js";

function createButton(label, onClick, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function openQuizDialog({ title, content, trigger, cancelLabel, action }) {
  const dialog = document.createElement("dialog");
  dialog.className = "quiz-preview quiz-flow-dialog";
  dialog.setAttribute("aria-labelledby", "quiz-flow-heading");

  const heading = document.createElement("h2");
  heading.id = "quiz-flow-heading";
  heading.textContent = title;

  const actions = document.createElement("div");
  actions.className = "quiz-flow-actions";

  const cancel = createButton(
    cancelLabel,
    () => dialog.close(),
    "quiz-flow-secondary",
  );
  cancel.autofocus = true;
  actions.append(cancel);

  let confirmed = false;

  if (action) {
    actions.append(createButton(action.label, () => {
      confirmed = true;
      dialog.close();
      action.run();
    }, "quiz-flow-primary"));
  }

  dialog.append(heading, content, actions);

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (!confirmed && trigger?.isConnected) trigger.focus();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();
}

export function openQuizInstructions(quiz, trigger, onStart, draft = null) {
  const content = document.createElement("div");
  content.className = "quiz-flow-copy";

  const name = document.createElement("strong");
  name.textContent = quiz.title;

  const details = document.createElement("p");
  const count = quiz.questions.length;
  details.textContent =
    `${quiz.courseCode} · ${count} ${count === 1 ? "question" : "questions"}`;

  const instructions = document.createElement("p");

  if (draft) {
    const answered = draft.answers.filter((answer) => answer !== null).length;
    instructions.textContent =
      `${answered} of ${count} answered. Resume at question ${draft.questionIndex + 1}.`;
  } else {
    instructions.textContent =
      "Choose one answer per question. Use the navigator to move between questions. " +
      "Your progress is saved in this browser as you go.";
  }

  content.append(name, details, instructions);

  openQuizDialog({
    title: draft ? "Resume quiz" : "Quiz instructions",
    content,
    trigger,
    cancelLabel: "Cancel",
    action: { label: draft ? "Resume quiz" : "Start quiz", run: onStart },
  });
}

export function confirmQuizSubmission(questionCount, trigger, onConfirm) {
  const message = document.createElement("p");
  message.textContent = questionCount === 1
    ? "You’ve answered the question. Submit to record your score."
    : `You’ve answered all ${questionCount} questions. Submit to record your score.`;

  openQuizDialog({
    title: "Submit quiz?",
    content: message,
    trigger,
    cancelLabel: "Keep answering",
    action: { label: "Submit quiz", run: onConfirm },
  });
}

export function openQuizHistory(trigger) {
  const finishedTime = (attempt) => Date.parse(attempt.finishedAt) || 0;
  const attempts = loadQuizHistory().sort((a, b) => finishedTime(b) - finishedTime(a));
  const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const catalog = new Map();
  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const date = (attempt) => {
    const time = Date.parse(attempt.finishedAt);
    return Number.isFinite(time) ? dateFormat.format(time) : "Date unavailable";
  };
  const courseLabel = (attempt) => {
    const code = attempt.courseCode || "";
    const name = catalog.get(normalizeCourseCode(code));
    return name ? `${name} · ${code}` : code || "No course";
  };
  const dialog = make("dialog", "quiz-history-dialog");
  dialog.setAttribute("aria-labelledby", "quiz-history-heading");
  const head = make("header", "quiz-history-header");
  const heading = make("h2", "", "Quiz History");
  heading.id = "quiz-history-heading";
  heading.tabIndex = -1;
  const icon = make("img", "quiz-history-icon");
  icon.src = themeAsset("icons/navigation/quizzes-tab.svg");
  icon.alt = "";
  const back = createButton("← Quiz History", showList, "quiz-history-button");
  back.hidden = true;
  const close = createButton("Close", () => dialog.close(), "quiz-history-button");
  head.append(icon, back, heading, close);
  const body = make("div", "quiz-history-body");
  const count = make("div", "quiz-history-toolbar");
  count.append(make("p", "", `${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"}`));
  if (attempts.length) count.append(make("span", "", "Newest first"));
  const list = make("ol", "quiz-history-list");
  const courseLabels = [];
  let previousButton;
  const detailCourse = make("p", "quiz-history-muted");
  let activeAttempt;
  for (const attempt of attempts) {
    const row = make("li", "quiz-history-row");
    const info = make("div", "quiz-history-info");
    const course = make("span", "quiz-history-course", courseLabel(attempt));
    courseLabels.push([course, attempt]);
    info.append(make("strong", "", attempt.title), course, make("span", "quiz-history-muted", date(attempt)));
    const score = make("strong", "quiz-history-score", `${attempt.score} / ${attempt.total}`);
    const details = createButton("Details", () => showDetails(attempt, details), "quiz-history-button");
    details.setAttribute("aria-label", `Details: ${attempt.title}, ${date(attempt)}`);
    const actions = make("div", "quiz-history-actions");
    actions.append(score, details);
    row.append(createCourseIcon(attempt.courseCode), info, actions);
    list.append(row);
  }
  const empty = make("p", "quiz-history-muted", "Finish a quiz to see your score here.");
  function showList() {
    activeAttempt = null;
    heading.textContent = "Quiz History";
    back.hidden = true;
    icon.hidden = false;
    body.replaceChildren(count, attempts.length ? list : empty);
    body.scrollTop = 0;
    if (previousButton) previousButton.focus();
  }
  function showDetails(attempt, button) {
    previousButton = button;
    activeAttempt = attempt;
    heading.textContent = attempt.title;
    back.hidden = false;
    icon.hidden = true;
    detailCourse.textContent = `${courseLabel(attempt)} · ${date(attempt)}`;
    const summary = make("div", "quiz-history-summary");
    const score = make("div", "quiz-history-score-copy");
    score.append(make("span", "", "Score"), make("strong", "", `${attempt.score} / ${attempt.total}`));
    summary.append(score);
    if (attempt.total > 0) summary.append(make("strong", "quiz-history-percentage", `${Math.round(attempt.score / attempt.total * 100)}%`));
    const totals = make("div", "quiz-history-totals");
    totals.append(make("strong", "quiz-history-correct", `${attempt.score} correct`), make("strong", "quiz-history-incorrect", `${attempt.total - attempt.score} incorrect`));
    body.replaceChildren(detailCourse, summary, totals);
    body.scrollTop = 0;
    heading.focus();
  }
  close.autofocus = true;
  dialog.append(head, body);
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger?.isConnected) trigger.focus();
  }, { once: true });
  showList();
  document.body.append(dialog);
  dialog.showModal();
  if (attempts.length) {
    loadCourseCatalog().then((courses) => {
      if (!dialog.open) return;
      for (const course of courses) catalog.set(normalizeCourseCode(course.code), course.name);
      for (const [label, attempt] of courseLabels) label.textContent = courseLabel(attempt);
      if (activeAttempt) detailCourse.textContent = `${courseLabel(activeAttempt)} · ${date(activeAttempt)}`;
    }).catch((error) => console.error("Could not load course names for Quiz History.", error));
  }
}
