import { createRankLadderButton } from "./rank-ladder.js";
import { getExperience } from "../services/experience.js";
import { readPreferences } from "../services/preferences.js";
import {
  formatGoalProgress,
  getProfileIcon,
} from "../services/study-goals.js";

const numberFormat = new Intl.NumberFormat("en-PH");

export async function openProfile(trigger) {
  const profile = readPreferences();
  const portrait = getProfileIcon(profile.badge);
  const dialog = document.createElement("dialog");

  dialog.className = "header-search-dialog scholar-profile-dialog";
  dialog.setAttribute("aria-labelledby", "scholar-profile-heading");

  dialog.innerHTML = `
    <div class="search-dialog-heading">
      <h2 id="scholar-profile-heading">Profile</h2>
      <button type="button" data-close autofocus>Close</button>
    </div>

    <div class="profile-identity">
      <img width="56" height="56" alt="" data-profile-badge>
      <div>
        <p class="profile-name" data-display-name></p>
      </div>
      <strong class="profile-level" data-level hidden></strong>
    </div>

    <p role="status">Loading EXP…</p>

    <section class="profile-progress" aria-label="Level progress" hidden>
      <div class="profile-progress-label">
        <img width="36" height="36" alt="" data-rank-icon>
        <strong data-rank-name></strong>
      </div>
      <div class="profile-progress-label">
        <strong data-total-exp></strong>
        <span data-level-exp></span>
      </div>
      <progress aria-label="Level progress"></progress>
      <p data-next-level></p>
    </section>

    <section class="home-daily-quest" aria-labelledby="profile-exp-goal"
      hidden style="display: none">
      <h3 id="profile-exp-goal">Daily EXP Goal</h3>
      <p data-daily-exp></p>
      <progress aria-label="Daily EXP goal"></progress>
    </section>

    <a class="profile-settings" href="#/settings">Open Settings</a>
  `;

  const avatar = dialog.querySelector("[data-profile-badge]");
  const rankIcon = dialog.querySelector("[data-rank-icon]");
  const level = dialog.querySelector("[data-level]");
  const status = dialog.querySelector('[role="status"]');
  const panel = dialog.querySelector(".profile-progress");
  const progress = panel.querySelector("progress");
  const goal = dialog.querySelector("#profile-exp-goal").parentElement;
  const goalBar = goal.querySelector("progress");

  avatar.addEventListener("error", () => { avatar.hidden = true; }, { once: true });
  rankIcon.addEventListener("error", () => { rankIcon.hidden = true; }, { once: true });
  avatar.src = portrait.url;
  avatar.style.imageRendering = "pixelated";
  rankIcon.style.objectFit = "contain";
  rankIcon.style.imageRendering = "pixelated";
  dialog.querySelector("[data-display-name]").textContent = profile.displayName;

  let restoreFocus = true;

  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());

  dialog.querySelector(".profile-settings").addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    restoreFocus = window.location.hash === "#/settings";
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (restoreFocus && trigger?.isConnected) trigger.focus();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();

  try {
    const experience = await getExperience();
    if (!dialog.open) return;

    const format = (value) => numberFormat.format(value);

    rankIcon.src = experience.rankIcon;
    panel.querySelector("[data-rank-name]").textContent = experience.rankName;
    level.textContent = `Level ${format(experience.level)}`;
    panel.querySelector("[data-total-exp]").textContent =
      `${format(experience.totalExp)} total EXP`;

    const current = panel.querySelector("[data-level-exp]");
    const next = panel.querySelector("[data-next-level]");

    if (experience.atCap) {
      current.textContent = "Maximum level reached";
      next.textContent = "All 20 ranks unlocked";
    } else {
      current.textContent =
        `${format(experience.levelExp)} / ${format(experience.expPerLevel)} EXP`;
      next.textContent =
        `${format(experience.expToNextLevel)} EXP to Level ${format(experience.level + 1)}`;

      if (experience.nextRank) {
        next.textContent +=
          ` · Next rank: ${experience.nextRank} (Lv. ${experience.nextRankLevel})`;
      }
    }

    progress.max = experience.expPerLevel;
    progress.value = experience.levelExp;

    const ladder = createRankLadderButton(experience.level);
    ladder.style.marginBlockStart = "12px";
    panel.append(ladder);

    goal.querySelector("[data-daily-exp]").textContent = formatGoalProgress(
      experience.todayExp,
      profile.dailyExpGoal,
      "EXP earned",
    );
    goalBar.max = profile.dailyExpGoal;
    goalBar.value = Math.min(experience.todayExp, profile.dailyExpGoal);

    level.hidden = false;
    panel.hidden = false;
    goal.hidden = false;
    goal.style.removeProperty("display");
    status.hidden = true;
  } catch (error) {
    console.error("Could not load profile EXP.", error);
    if (dialog.open) status.textContent = "Couldn’t load your EXP right now.";
  }
}