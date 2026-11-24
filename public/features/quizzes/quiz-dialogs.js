import { loadQuizHistory } from "../../services/quiz-catalog.js";

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
  const content = document.createElement("div");
  content.className = "quiz-flow-copy";

  const history = loadQuizHistory();

  if (history.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Finish a quiz to see your score here.";
    content.append(message);
  } else {
    const list = document.createElement("ol");
    list.className = "quiz-flow-history";

    for (const attempt of history) {
      const item = document.createElement("li");
      const finished = new Date(attempt.finishedAt);
      const date = Number.isFinite(finished.getTime())
        ? finished.toLocaleString()
        : "Date unavailable";

      item.textContent =
        `${attempt.title} (${attempt.courseCode}) · ` +
        `${attempt.score}/${attempt.total} · ${date}`;

      list.append(item);
    }

    content.append(list);
  }

  openQuizDialog({
    title: "Quiz history",
    content,
    trigger,
    cancelLabel: "Close",
  });
}