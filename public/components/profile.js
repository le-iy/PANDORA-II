import { getExperience } from "../services/experience.js";
import { readPreferences } from "../services/preferences.js";
import { formatGoalProgress, getScholarBadge } from "../services/study-goals.js";

const numberFormat = new Intl.NumberFormat("en-PH");

export async function openProfile(trigger) {
  const profile = readPreferences();
  const badge = getScholarBadge(profile.badge);
  const dialog = document.createElement("dialog");

  dialog.className = "header-search-dialog scholar-profile-dialog";
  dialog.setAttribute("aria-labelledby", "scholar-profile-heading");

  dialog.innerHTML = `
    <div class="search-dialog-heading">
      <h2 id="scholar-profile-heading">Scholar profile</h2>
      <button type="button" data-close autofocus>Close</button>
    </div>

    <div class="profile-identity">
      <img width="48" height="48" alt="" data-profile-badge>
      <div>
        <p class="profile-name" data-display-name></p>
        <p class="profile-badge-label" data-badge-label></p>
      </div>
      <strong class="profile-level" data-level hidden></strong>
    </div>

    <p role="status">Loading EXP…</p>

    <section class="profile-progress" aria-label="Level progress" hidden>
      <div class="profile-progress-label">
        <strong data-total-exp></strong>
        <span data-level-exp></span>
      </div>
      <progress aria-label="EXP progress toward the next level"></progress>
      <p data-next-level></p>
    </section>

    <section class="home-daily-quest" aria-labelledby="profile-exp-goal" hidden>
      <h3 id="profile-exp-goal">Daily EXP Goal</h3>
      <p data-daily-exp></p>
      <progress aria-label="Daily EXP goal"></progress>
    </section>

    <a class="profile-settings" href="#/settings">Open Settings</a>
  `;

  const badgeImage = dialog.querySelector("[data-profile-badge]");
  badgeImage.src = badge.url;
  badgeImage.addEventListener("error", () => badgeImage.remove(), { once: true });

  dialog.querySelector("[data-display-name]").textContent = profile.displayName;
  dialog.querySelector("[data-badge-label]").textContent = badge.label;

  let restoreFocus = true;

  dialog.querySelector("[data-close]").addEventListener("click", () => {
    dialog.close();
  });

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

  const status = dialog.querySelector('[role="status"]');
  const level = dialog.querySelector("[data-level]");
  const panel = dialog.querySelector(".profile-progress");
  const progress = panel.querySelector("progress");
  const goal = dialog.querySelector('[aria-labelledby="profile-exp-goal"]');
  const goalBar = goal.querySelector("progress");

  // The shared goal block uses display:grid. Keep it hidden until EXP loads.
  goal.style.display = "none";

  try {
    const experience = await getExperience();
    if (!dialog.open) return;

    level.textContent = `Level ${numberFormat.format(experience.level)}`;

    panel.querySelector("[data-total-exp]").textContent =
      `${numberFormat.format(experience.totalExp)} total EXP`;

    panel.querySelector("[data-level-exp]").textContent =
      `${numberFormat.format(experience.levelExp)} / ` +
      `${numberFormat.format(experience.expPerLevel)} EXP`;

    panel.querySelector("[data-next-level]").textContent =
      `${numberFormat.format(experience.expToNextLevel)} EXP to ` +
      `Level ${numberFormat.format(experience.level + 1)}`;

    progress.max = experience.expPerLevel;
    progress.value = experience.levelExp;

    goal.querySelector("[data-daily-exp]").textContent = formatGoalProgress(
      experience.todayExp, profile.dailyExpGoal, "EXP earned",
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

    if (dialog.open) {
      status.textContent = "Couldn’t load your EXP right now.";
    }
  }
}