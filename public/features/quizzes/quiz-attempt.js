import {
  saveQuizAttempt,
  saveQuizDraft,
} from "../../services/quiz-catalog.js";

import { appendQuestionImage } from "./quiz-editor.js";
import { confirmQuizSubmission } from "./quiz-dialogs.js";
import { createQuizNavigator } from "./quiz-navigator.js";
import { showQuizResults } from "./quiz-results.js";

export function renderQuizAttempt(container, quiz, onBack, draft = null) {
  const workspace = document.createElement("section");
  workspace.className = "quiz-workspace quiz-attempt-workspace";

  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back to Quizzes";
  back.addEventListener("click", onBack);

  const heading = document.createElement("h1");
  heading.textContent = quiz.title;

  const body = document.createElement("div");
  body.className = "quiz-attempt-body";

  const form = document.createElement("form");
  const questionArea = document.createElement("div");
  questionArea.className = "quiz-attempt-question-area";

  const feedback = document.createElement("p");
  feedback.className = "quiz-attempt-feedback";
  feedback.setAttribute("role", "status");

  const storageFeedback = document.createElement("p");
  storageFeedback.className = "quiz-attempt-feedback";
  storageFeedback.setAttribute("role", "status");

  form.append(questionArea, feedback, storageFeedback);

  const total = quiz.questions.length;
  const answers = draft ? [...draft.answers] : Array(total).fill(null);
  const attemptId = draft?.attemptId ?? crypto.randomUUID();

  let questionIndex = draft?.questionIndex ?? 0;
  let submitted = false;

  const navigator = createQuizNavigator(total, (index) => moveTo(index));

  function saveProgress() {
    const saved = saveQuizDraft(quiz, { attemptId, questionIndex, answers });
    storageFeedback.textContent = saved
      ? ""
      : "Couldn’t autosave progress. Keep this page open to continue.";
  }

  function moveTo(index, message = "") {
    questionIndex = index;
    feedback.textContent = message;
    saveProgress();
    showQuestion();
  }

  function showQuestion() {
    const question = quiz.questions[questionIndex];
    const fieldset = document.createElement("fieldset");

    const prompt = document.createElement("legend");
    prompt.textContent = `${questionIndex + 1} of ${total} · ${question.prompt}`;
    prompt.tabIndex = -1;
    fieldset.append(prompt);
    appendQuestionImage(fieldset, question);

    for (const [index, choice] of question.choices.entries()) {
      const option = document.createElement("label");
      option.className = "quiz-choice";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "answer";
      radio.value = String(index);
      radio.checked = answers[questionIndex] === index;

      option.append(radio, document.createTextNode(choice));
      fieldset.append(option);
    }

    const actions = document.createElement("div");
    actions.className = "quiz-attempt-actions";

    if (questionIndex > 0) {
      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "Previous question";
      previous.addEventListener("click", () => moveTo(questionIndex - 1));
      actions.append(previous);
    }

    if (questionIndex < total - 1) {
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "Next question";
      next.addEventListener("click", () => moveTo(questionIndex + 1));
      actions.append(next);
    }

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Review submission";
    actions.append(submit);

    questionArea.replaceChildren(fieldset, actions);
    navigator.update(questionIndex, answers);
    prompt.focus();
  }

  form.addEventListener("change", (event) => {
    if (event.target.name !== "answer") return;

    answers[questionIndex] = Number(event.target.value);
    feedback.textContent = "";
    saveProgress();
    navigator.update(questionIndex, answers);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitted) return;

    const unanswered = answers.indexOf(null);

    if (unanswered !== -1) {
      const remaining = answers.filter((answer) => answer === null).length;
      const message = remaining === 1
        ? "Answer the remaining question before submitting."
        : `Answer the remaining ${remaining} questions before submitting.`;

      moveTo(unanswered, message);
      return;
    }

    feedback.textContent = "";
    saveProgress();

    const trigger = questionArea.querySelector('button[type="submit"]');

    confirmQuizSubmission(total, trigger, () => {
      if (!form.isConnected || submitted) return;

      const score = quiz.questions.filter(
        (question, index) => question.correctAnswerIndex === answers[index],
      ).length;

      if (!saveQuizAttempt(quiz, score, attemptId)) {
        feedback.textContent = "Couldn’t record your score. Try submitting again.";
        trigger.focus();
        return;
      }

      submitted = true;
      window.dispatchEvent(new Event("pandora:quiz-completed"));
      showQuizResults(body, quiz, answers, score);
    });
  });

  body.append(form, navigator.element);
  workspace.append(back, heading, body);
  container.replaceChildren(workspace);
  saveProgress();
  showQuestion();
}