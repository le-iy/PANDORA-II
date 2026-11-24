import { getExperience } from "../../services/experience.js";
import { readPreferences } from "../../services/preferences.js";
import {
  countTasksCompletedToday,
  formatGoalProgress,
} from "../../services/study-goals.js";
import { readTaskRewards } from "../../services/task-store.js";

const numberFormat = new Intl.NumberFormat("en-PH");
const refreshRequests = new WeakMap();

function readReward(taskId) {
  try {
    return readTaskRewards().find(({ id }) => id === taskId) ?? null;
  } catch (error) {
    console.error("Could not read task EXP.", error);
    return undefined;
  }
}

async function refreshQuestRewards(screen) {
  const panel = screen.querySelector(".task-rewards-panel");
  if (!panel) return;

  const request = {};
  refreshRequests.set(panel, request);

  try {
    const experience = await getExperience();
    if (!panel.isConnected || refreshRequests.get(panel) !== request) return;

    const level = panel.querySelector("[data-level]");
    const progress = panel.querySelector("[data-level-progress]");
    const next = panel.querySelector("[data-next-level]");
    const format = (value) => numberFormat.format(value);

    level.textContent = experience.atCap
      ? "Level 100 · Maximum level"
      : `Level ${format(experience.level)} · ` +
        `${format(experience.levelExp)} / ${format(experience.expPerLevel)} EXP`;

    next.textContent = experience.atCap
      ? "All 20 ranks unlocked"
      : `${format(experience.expToNextLevel)} EXP to Level ${format(experience.level + 1)}`;

    progress.max = experience.expPerLevel;
    progress.value = experience.levelExp;
    progress.hidden = false;
  } catch (error) {
    console.error("Could not refresh quest rewards.", error);
  }
}

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
    const previousReward = readReward(task.id);

    if (!onComplete()) {
      feedback.textContent = "Couldn’t complete this task. Try again.";
      return;
    }

    const reward = readReward(task.id);
    heading.textContent = "Task completed";

    if (reward && previousReward !== undefined) {
      const rewardMessage = document.createElement("p");
      rewardMessage.className = "task-completion-summary";
      rewardMessage.textContent = previousReward
        ? "EXP already earned for this task."
        : `+${numberFormat.format(reward.exp)} EXP earned`;
      actions.before(rewardMessage);
    }

    const quest = document.createElement("p");

    try {
      const { dailyTaskGoal } = readPreferences();
      const completed = countTasksCompletedToday();
      quest.textContent = formatGoalProgress(
        completed,
        dailyTaskGoal,
        "tasks completed",
      );
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

    void refreshQuestRewards(screen);
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (screen.isConnected) onClose();
  }, { once: true });

  screen.append(dialog);
  dialog.showModal();
}