import { createRankLadderButton } from "../../components/rank-ladder.js";
import { getExperience } from "../../services/experience.js";
import { readPreferences } from "../../services/preferences.js";
import {
  countTasksCompletedToday,
  formatGoalProgress,
} from "../../services/study-goals.js";

const numberFormat = new Intl.NumberFormat("en-PH");

function format(value) {
  return numberFormat.format(value);
}

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

  const badgeImage = panel.querySelector("[data-home-badge]");
  const badgeName = panel.querySelector("[data-home-badge-name]");
  const level = panel.querySelector("[data-level]");
  const total = panel.querySelector("[data-exp-total]");
  const progress = panel.querySelector("[data-level-progress]");
  const status = panel.querySelector('[role="status"]');

  badgeImage.hidden = true;
  badgeImage.addEventListener("error", () => {
    badgeImage.hidden = true;
  }, { once: true });

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

    badgeImage.src = experience.rankIcon;
    badgeImage.hidden = false;
    badgeName.textContent = experience.rankName;

    level.textContent = `Level ${format(experience.level)}`;
    total.textContent = `${format(experience.totalExp)} total EXP`;

    progress.max = experience.expPerLevel;
    progress.value = experience.levelExp;
    progress.hidden = false;

    if (experience.atCap) {
      status.textContent = "Maximum level reached · All 20 ranks unlocked";
    } else {
      const headline = document.createElement("strong");
      headline.textContent = `${format(experience.expToNextLevel)} EXP to Level ${format(experience.level + 1)}`;
      const detail = document.createElement("span");
      const nextRank = experience.nextRank ? ` · Next rank: ${experience.nextRank} (Lv. ${experience.nextRankLevel})` : "";
      detail.textContent = `${format(experience.levelExp)} / ${format(experience.expPerLevel)} EXP${nextRank}`;
      status.replaceChildren(headline, detail);
    }

    const rankTrigger = createRankLadderButton(experience.level);
    rankTrigger.setAttribute("aria-label", "View rank ladder");
    rankTrigger.title = "View rank ladder";
    Object.assign(rankTrigger.style, {
      display: "inline-grid", placeItems: "center", width: "44px",
      padding: "0", border: "0", background: "transparent", cursor: "pointer",
    });
    badgeImage.replaceWith(rankTrigger);
    rankTrigger.replaceChildren(badgeImage);
    const showFallback = () => { rankTrigger.textContent = "Rank"; };
    if (badgeImage.hidden) showFallback();
    else badgeImage.addEventListener("error", showFallback, { once: true });
    expGoal.show(experience.todayExp, settings.dailyExpGoal, "EXP earned");
  } catch (error) {
    console.error("Could not load EXP.", error);
    status.textContent = "Couldn’t load EXP.";
    expGoal.message("Couldn’t load today’s EXP.");
  }
}