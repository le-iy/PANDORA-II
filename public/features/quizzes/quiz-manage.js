import { removeCustomQuiz } from "../../services/quiz-catalog.js";

function createButton(label, onClick, className = "quiz-flow-secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

export function openQuizManager(quiz, trigger, { hasDraft, onEdit, onRemoved }) {
  const dialog = document.createElement("dialog");
  dialog.className = "quiz-preview quiz-flow-dialog";
  dialog.setAttribute("aria-labelledby", "quiz-manage-heading");

  const heading = document.createElement("h2");
  heading.id = "quiz-manage-heading";

  const summary = document.createElement("p");
  const feedback = document.createElement("p");
  feedback.setAttribute("role", "status");

  const actions = document.createElement("div");
  actions.className = "quiz-flow-actions";

  let restoreFocus = true;

  function showMenu() {
    heading.textContent = "Manage quiz";
    summary.textContent = hasDraft
      ? `${quiz.title} · Saving edits or removing this quiz will clear its unfinished attempt.`
      : quiz.title;
    feedback.textContent = "";

    const close = createButton("Close", () => dialog.close());
    const edit = createButton("Edit quiz", () => {
      restoreFocus = false;
      dialog.close();
      onEdit();
    }, "quiz-flow-primary");

    const remove = createButton("Remove quiz", showConfirmation);
    actions.replaceChildren(close, edit, remove);

    if (dialog.open) close.focus();
    return close;
  }

  function showConfirmation() {
    heading.textContent = "Remove quiz?";
    summary.textContent =
      `Remove “${quiz.title}” from your quiz list? Submitted attempts and earned EXP will be kept.`;

    const keep = createButton("Keep quiz", showMenu);
    const remove = createButton("Remove quiz", () => {
      try {
        removeCustomQuiz(quiz);
      } catch (error) {
        console.error("Could not remove quiz.", error);
        feedback.textContent = error.message || "Couldn’t remove the quiz.";
        return;
      }

      restoreFocus = false;
      dialog.close();
      onRemoved();
    }, "quiz-flow-primary");

    actions.replaceChildren(keep, remove);
    keep.focus();
  }

  const initial = showMenu();

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (restoreFocus && trigger.isConnected) trigger.focus();
  }, { once: true });

  dialog.append(heading, summary, feedback, actions);
  document.body.append(dialog);
  dialog.showModal();
  initial.focus();
}