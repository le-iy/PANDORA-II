import { getExperience } from "../../services/experience.js";
import { readPreferences } from "../../services/preferences.js";
import {
  countTasksCompletedToday,
  formatGoalProgress,
  getScholarBadge,
} from "../../services/study-goals.js";

const numberFormat = new Intl.NumberFormat("en-PH");

function createGoalPanel(title) {
  const block = document.createElement("div");
  block.className = "home-daily-quest";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const summary = document.createElement("p");
  const progress = document.createElement("progress");
  progress.hidden = true;
  progress.setAttribute("aria-label", title);

  block.append(heading, summary, progress);

  return {
    block,
    show(current, target, unit) {
      summary.textContent = formatGoalProgress(current, target, unit);
      progress.max = target;
      progress.value = Math.min(current, target);
      progress.hidden = false;
    },
    message(text) {
      summary.textContent = text;
    },
  };
}

export async function renderHomeLevel(panel) {
  const today = new Date();
  const settings = readPreferences();
  const badge = getScholarBadge(settings.badge);

  const badgeImage = panel.querySelector("[data-home-badge]");
  badgeImage.addEventListener("error", () => badgeImage.remove(), { once: true });
  badgeImage.src = badge.url;
  panel.querySelector("[data-home-badge-name]").textContent = badge.label;

  const level = panel.querySelector("[data-level]");
  const total = panel.querySelector("[data-exp-total]");
  const progress = panel.querySelector("[data-level-progress]");
  const status = panel.querySelector('[role="status"]');

  const questGoal = createGoalPanel("Daily Quest");
  const expGoal = createGoalPanel("Daily EXP Goal");
  expGoal.message("Loading today’s EXP…");
  panel.append(questGoal.block, expGoal.block);

  try {
    questGoal.show(
      countTasksCompletedToday(today),
      settings.dailyTaskGoal,
      "tasks completed",
    );
  } catch (error) {
    console.error("Could not load daily quest.", error);
    questGoal.message("Couldn’t load today’s task count.");
  }

  try {
    const experience = await getExperience(today);

    level.textContent = `Level ${numberFormat.format(experience.level)}`;
    total.textContent = `${numberFormat.format(experience.totalExp)} total EXP`;

    progress.max = experience.expPerLevel;
    progress.value = experience.levelExp;
    progress.hidden = false;

    status.textContent =
      `${numberFormat.format(experience.levelExp)} / ` +
      `${numberFormat.format(experience.expPerLevel)} EXP · ` +
      `${numberFormat.format(experience.expToNextLevel)} EXP to ` +
      `Level ${numberFormat.format(experience.level + 1)}`;

    expGoal.show(experience.todayExp, settings.dailyExpGoal, "EXP earned");
  } catch (error) {
    console.error("Could not load EXP.", error);
    status.textContent = "Couldn’t load EXP.";
    expGoal.message("Couldn’t load today’s EXP.");
  }
}