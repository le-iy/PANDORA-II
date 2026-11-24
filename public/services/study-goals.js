import { activeThemePack, celestialIcons, themeAsset } from "./theme-packs.js";

const trinkets = {
  scholar: { label: "Sleepy cat", file: "sleepy-cat-charm.svg" },
  books: { label: "Book stack", file: "book-stack.svg" },
  finisher: { label: "Star charm", file: "star-charm.svg" },
  "latte-mug": { label: "Latte mug", file: "latte-mug.svg" },
  "tiny-cactus": { label: "Tiny cactus", file: "tiny-cactus.svg" },
  "hanging-moon": { label: "Hanging moon", file: "hanging-moon.svg" },
  "ribbon-bow": { label: "Ribbon bow", file: "ribbon-bow.svg" },
  "paper-crane": { label: "Paper crane", file: "paper-crane.svg" },
};

const portraitPairs = [
  ["lavender-bob", "masc"],
  ["mint-curls", "masc"],
  ["copper-bun", "masc"],
  ["midnight-fringe", "femme"],
  ["rose-twin-tails", "masc"],
  ["honey-waves", "masc"],
  ["indigo-braids", "masc"],
  ["cloud-crop", "femme"],
  ["sage-side-part", "femme"],
  ["blue-headphones", "femme"],
  ["plum-glasses", "masc"],
  ["peach-ponytail", "masc"],

  ["moon-swordswoman", "masc", "Moon swordsfighter"],
  ["rival-duelist", "femme"],
  ["star-academy-student", "masc"],
  ["magical-baker", "masc"],
  ["mecha-pilot", "femme"],
  ["idol-trainee", "masc"],
  ["rainy-day-transfer", "masc"],
  ["arcade-champion", "femme"],
  ["flower-club-lead", "masc"],
  ["sky-courier", "femme"],

  ["librarian", "masc"],
  ["nurse", "masc"],
  ["chef", "femme"],
  ["architect", "femme"],
  ["firefighter", "femme"],
  ["photographer", "masc"],
  ["astronomer", "femme"],
  ["musician", "masc"],
  ["software-developer", "femme"],
  ["gardener", "masc"],

  ["toddler-with-bow", "masc"],
  ["playground-explorer", "femme"],
  ["young-reader", "masc"],
  ["teen-skater", "femme"],
  ["university-student", "masc"],
  ["young-professional", "femme"],
  ["parent-on-the-go", "masc"],
  ["silver-haired-professor", "femme"],
  ["grandpa-storyteller", "femme", "Grandma storyteller"],
  ["grandma-knitter", "masc", "Grandpa knitter"],

  ["mushroom-mage", "masc"],
  ["moon-witch", "masc", "Moon wizard"],
  ["potion-maker", "masc"],
  ["forest-elf", "femme"],
  ["tiny-knight", "femme"],
  ["dragon-keeper", "masc"],
  ["cloud-shepherd", "femme"],
  ["lantern-keeper", "femme"],
  ["royal-archivist", "masc"],
  ["star-fairy", "masc"],
];

const portraits = {};

for (const [slug, variant, alternateLabel] of portraitPairs) {
  const name = slug.replaceAll("-", " ");
  const label = name[0].toUpperCase() + name.slice(1);
  const originalId = `profile-${slug}`;
  const alternateId = `${originalId}-${variant}`;

  portraits[originalId] = {
    label,
    file: `${originalId}.svg`,
  };

  portraits[alternateId] = {
    label: `${alternateLabel ?? label} · ${variant === "masc" ? "Masc" : "Femme"}`,
    file: `${alternateId}.svg`,
  };
}

export const profileIcons = Object.freeze({ ...trinkets, ...portraits });

// The preferences service uses this export to validate saved icon IDs.
export const scholarBadges = profileIcons;

export const goalLimits = Object.freeze({
  dailyTaskGoal: { min: 1, max: 20 },
  dailyExpGoal: { min: 10, max: 1000 },
});

export function getProfileIcons(pack = activeThemePack()) {
  return pack === "galaxy" ? { ...celestialIcons, ...portraits } : profileIcons;
}

export function getProfileIcon(id, pack = activeThemePack()) {
  const options = getProfileIcons(pack);
  const icon = Object.hasOwn(options, id)
    ? options[id]
    : options[pack === "galaxy" ? "celestial-ringed-planet" : "scholar"];
  const path = icon.file.includes("/")
    ? icon.file
    : Object.hasOwn(portraits, id)
      ? `icons/profile/${icon.file}`
      : `illustrations/trinkets/${icon.file}`;

  return { label: icon.label, url: themeAsset(path, pack) };
}

export const getScholarBadge = getProfileIcon;

export function countTasksCompletedToday(today = new Date()) {
  const tasks = JSON.parse(localStorage.getItem("pandora-ii.tasks") ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  const start = new Date(
    today.getFullYear(), today.getMonth(), today.getDate(),
  ).getTime();

  const end = new Date(
    today.getFullYear(), today.getMonth(), today.getDate() + 1,
  ).getTime();

  return tasks.filter((task) => {
    if (!task?.completed || typeof task.completedAt !== "string") return false;

    const completedAt = Date.parse(task.completedAt);
    return completedAt >= start && completedAt < end;
  }).length;
}

export function formatGoalProgress(current, target, unit) {
  const summary = `${current} / ${target} ${unit} today`;
  return current >= target ? `${summary} · Goal reached` : summary;
}