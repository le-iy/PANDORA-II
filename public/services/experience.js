import {
  loadQuizHistory,
  loadQuizzes,
  quizRewardKey,
} from "./quiz-catalog.js";

const expPerLevel = 300;

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

    if (!rewards.has(key) && Number.isFinite(quiz.expReward)) {
      rewards.set(key, quiz.expReward);
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

  const level = Math.floor(totalExp / expPerLevel) + 1;
  const levelExp = totalExp % expPerLevel;

  return {
    totalExp,
    todayExp,
    level,
    levelExp,
    expPerLevel,
    expToNextLevel: expPerLevel - levelExp,
  };
}