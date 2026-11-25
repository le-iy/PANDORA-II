import { getRankProgress } from "../services/experience.js";

function buildRanks() {
  const ranks = [];
  let threshold = 0;

  for (let level = 1; level <= 100; level += 1) {
    const progress = getRankProgress(threshold);

    if ((level - 1) % 5 === 0) {
      ranks.push({
        name: progress.rankName,
        icon: progress.rankIcon,
        firstLevel: level,
        lastLevel: level + 4,
      });
    }

    threshold += progress.expPerLevel;
  }

  return ranks;
}

export function createRankLadderButton(currentLevel) {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.textContent = "View rank ladder";
  trigger.setAttribute("aria-haspopup", "dialog");

  Object.assign(trigger.style, {
    justifySelf: "start",
    minHeight: "44px",
    padding: "8px 12px",
    borderColor: "var(--color-border)",
    fontWeight: "700",
  });

  trigger.addEventListener("click", () => {
    const dialog = document.createElement("dialog");
    dialog.className = "header-search-dialog";
    dialog.setAttribute("aria-labelledby", "rank-ladder-heading");

    dialog.innerHTML = `
      <header class="search-dialog-heading">
        <h2 id="rank-ladder-heading">Rank ladder</h2>
        <button type="button" data-close autofocus>Close</button>
      </header>
      <p data-summary></p>
      <ol aria-label="Ranks from Level 1 to Level 100" tabindex="0"></ol>
    `;

    Object.assign(dialog.style, {
      maxHeight: "calc(100dvh - 24px)",
      overflow: "hidden",
    });

    const header = dialog.querySelector("header");
    Object.assign(header.style, {
      position: "static",
      flex: "none",
      margin: "0",
    });

    const summary = dialog.querySelector("[data-summary]");
    summary.textContent = `Level ${currentLevel} of 100 · A new rank every 5 levels`;
    Object.assign(summary.style, {
      flex: "none",
      margin: "0",
      color: "var(--color-text-muted)",
      fontSize: "0.875rem",
    });

    const list = dialog.querySelector("ol");
    Object.assign(list.style, {
      position: "relative",
      display: "grid",
      flex: "1 1 auto",
      alignContent: "start",
      gap: "8px",
      minHeight: "0",
      margin: "0",
      padding: "4px",
      listStyle: "none",
      overflowY: "auto",
      overscrollBehavior: "contain",
      scrollbarGutter: "stable",
    });

    const close = dialog.querySelector("[data-close]");
    let currentRow;

    for (const rank of buildRanks()) {
      const row = document.createElement("li");
      const unlocked = currentLevel >= rank.firstLevel;
      const current = unlocked && currentLevel <= rank.lastLevel;

      Object.assign(row.style, {
        display: "grid",
        gridTemplateColumns: "40px minmax(0, 1fr)",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-control)",
        background: current ? "var(--color-surface-muted)" : "var(--color-surface)",
      });

      if (current) {
        row.style.borderColor = "var(--color-primary)";
        row.setAttribute("aria-current", "step");
        currentRow = row;
      }

      const icon = document.createElement("img");
      icon.width = 40;
      icon.height = 40;
      icon.alt = "";
      icon.src = rank.icon;
      icon.style.objectFit = "contain";

      const copy = document.createElement("div");
      copy.style.overflowWrap = "anywhere";

      const title = document.createElement("strong");
      title.textContent = rank.name;

      const detail = document.createElement("div");
      detail.style.fontSize = "0.875rem";
      detail.style.color = "var(--color-text-muted)";

      const state = current ? "Current rank" : unlocked ? "Unlocked" : "Locked";
      detail.textContent = `Levels ${rank.firstLevel}–${rank.lastLevel} · ${state}`;

      copy.append(title, detail);
      row.append(icon, copy);
      list.append(row);
    }

    close.addEventListener("click", () => dialog.close());

    dialog.addEventListener("close", () => {
      dialog.remove();
      if (trigger.isConnected) trigger.focus();
    }, { once: true });

    document.body.append(dialog);
    dialog.showModal();

    Object.assign(dialog.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    });

    if (currentRow) {
      list.scrollTop = Math.max(0, currentRow.offsetTop - 4);
    }
  });

  return trigger;
}