import { readPreferences } from "../../services/preferences.js";
import {
  countTasksCompletedToday,
  formatGoalProgress,
} from "../../services/study-goals.js";

export function openTaskCompletion(screen, task, { onComplete, onClose }) {
  const dialog = document.createElement("dialog");
  dialog.className = "task-editor";
  dialog.setAttribute("aria-labelledby", "task-completion-heading");

  dialog.innerHTML = `
    <h2 id="task-completion-heading">Complete task?</h2>
    <p data-task-name></p>
    <p class="task-feedback" role="status"></p>

    <div class="task-editor-actions">
      <button type="button" data-keep autofocus>Cancel</button>
      <button type="button" class="task-primary" data-complete>Mark complete</button>
    </div>
  `;

  const heading = dialog.querySelector("h2");
  const feedback = dialog.querySelector('[role="status"]');
  const actions = dialog.querySelector(".task-editor-actions");
  const complete = dialog.querySelector("[data-complete]");

  dialog.querySelector("[data-task-name]").textContent = task.title;

  dialog.querySelector("[data-keep]").addEventListener("click", () => {
    dialog.close();
  });

  complete.addEventListener("click", () => {
    if (!onComplete()) {
      feedback.textContent = "Couldn’t complete this task. Try again.";
      return;
    }

    heading.textContent = "Task completed";

    const quest = document.createElement("p");
    quest.className = "task-completion-summary";

    try {
      const { dailyTaskGoal } = readPreferences();
      const completed = countTasksCompletedToday();

      quest.textContent = formatGoalProgress(completed, dailyTaskGoal, "tasks completed");
    } catch (error) {
      console.error("Could not load daily quest progress.", error);
      quest.textContent = "Your task was saved as completed.";
    }

    feedback.textContent = "";
    actions.before(quest);

    const done = document.createElement("button");
    done.type = "button";
    done.className = "task-primary";
    done.textContent = "Done";
    done.addEventListener("click", () => dialog.close());

    actions.replaceChildren(done);
    done.focus();
  }, { once: false });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (screen.isConnected) onClose();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
}