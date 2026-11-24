import { themeAsset } from "./theme-packs.js";
import {
  loadQuizHistory,
  loadQuizzes,
  quizRewardKey,
} from "./quiz-catalog.js";
import { readTaskRewards } from "./task-store.js";

const maxLevel = 100;

const rankNames = [
  "Scholar",
  "Bookkeeper",
  "Quest Finisher",
  "Study Scout",
  "Note Keeper",
  "Quiz Solver",
  "Researcher",
  "Steady Scholar",
  "Course Navigator",
  "Study Strategist",
  "Archive Curator",
  "Quiz Specialist",
  "Research Fellow",
  "Academic Mentor",
  "Knowledge Curator",
  "Distinguished Scholar",
  "Academic Virtuoso",
  "Master Scholar",
  "Grand Scholar",
  "Pandora Laureate",
];

function expRequired(level) {
  return Math.round((300 + 4700 * (level - 1) / (maxLevel - 2)) / 10) * 10;
}

export function getRankProgress(totalExp) {
  let level = 1;
  let remaining = Math.max(0, totalExp);

  while (level < maxLevel && remaining >= expRequired(level)) {
    remaining -= expRequired(level);
    level += 1;
  }

  const atCap = level === maxLevel;
  const expPerLevel = expRequired(Math.min(level, maxLevel - 1));
  const levelExp = atCap ? expPerLevel : remaining;
  const rankIndex = Math.floor((level - 1) / 5);
  const rankName = rankNames[rankIndex];
  const slug = rankName.toLowerCase().replaceAll(" ", "-");

  return {
    level,
    atCap,
    levelExp,
    expPerLevel,
    expToNextLevel: expPerLevel - levelExp,
    rankName,
    rankIcon: themeAsset(`icons/ranks/rank-${slug}.svg`),
    nextRank: rankNames[rankIndex + 1] ?? null,
    nextRankLevel: rankIndex < rankNames.length - 1
      ? (rankIndex + 1) * 5 + 1
      : null,
  };
}

export async function getExperience(today = new Date()) {
  const quizzes = await loadQuizzes({ includeRemoved: true });
  const history = loadQuizHistory();
  const rewards = new Map();
  const keysById = new Map();

  for (const quiz of quizzes) {
    const key = quizRewardKey(quiz);

    if (quiz.id != null && !keysById.has(quiz.id)) {
      keysById.set(quiz.id, key);
    }

    const reward = quiz.earnedExpReward ?? quiz.expReward;
    if (!rewards.has(key) && Number.isFinite(reward)) {
      rewards.set(key, reward);
    }
  }

  const firstPerfectScores = new Map();

  for (const attempt of history) {
    const key = attempt.rewardKey
      ?? keysById.get(attempt.quizId)
      ?? quizRewardKey(attempt);

    if (attempt.total <= 0 || attempt.score !== attempt.total || !rewards.has(key)) {
      continue;
    }

    const timestamp = Date.parse(attempt.finishedAt);
    const time = Number.isFinite(timestamp) ? timestamp : Infinity;
    const firstTime = firstPerfectScores.get(key);

    if (firstTime === undefined || time < firstTime) {
      firstPerfectScores.set(key, time);
    }
  }

  const dayStart = new Date(
    today.getFullYear(), today.getMonth(), today.getDate(),
  ).getTime();

  const dayEnd = new Date(
    today.getFullYear(), today.getMonth(), today.getDate() + 1,
  ).getTime();

  let totalExp = 0;
  let todayExp = 0;

  for (const [key, time] of firstPerfectScores) {
    const reward = rewards.get(key);
    totalExp += reward;

    if (time >= dayStart && time < dayEnd) {
      todayExp += reward;
    }
  }

  for (const { exp, earnedAt } of readTaskRewards()) {
    totalExp += exp;

    const time = Date.parse(earnedAt);
    if (time >= dayStart && time < dayEnd) {
      todayExp += exp;
    }
  }

  return { totalExp, todayExp, ...getRankProgress(totalExp) };
}