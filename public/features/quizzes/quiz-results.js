import {
  loadQuizHistory,
  quizRewardKey,
} from "../../services/quiz-catalog.js";
import { appendQuestionImage } from "./quiz-editor.js";

const numberFormat = new Intl.NumberFormat("en-PH");

function createMetric(value, label) {
  const metric = document.createElement("div");
  const number = document.createElement("strong");
  const description = document.createElement("span");

  number.textContent = value;
  description.textContent = label;
  metric.append(number, description);

  return metric;
}

function getRewardMessage(quiz, score, total) {
  if (!Number.isFinite(quiz.expReward) || quiz.expReward <= 0) return "";

  if (score !== total) {
    return "Get a perfect score to earn this quiz’s EXP reward.";
  }

  const rewardKey = quizRewardKey(quiz);

  // The attempt screen saves the current score before rendering results.
  const perfectAttempts = loadQuizHistory().filter((attempt) => {
    const key = attempt.rewardKey ?? (
      quiz.id != null && attempt.quizId === quiz.id
        ? rewardKey
        : quizRewardKey(attempt)
    );

    return key === rewardKey &&
      attempt.total > 0 &&
      attempt.score === attempt.total;
  });

  if (perfectAttempts.length === 0) return "";

  return perfectAttempts.length === 1
    ? `+${numberFormat.format(quiz.expReward)} EXP earned`
    : "EXP already earned for this quiz.";
}

function createReviewItem(question, selectedIndex) {
  const correct = selectedIndex === question.correctAnswerIndex;
  const item = document.createElement("li");
  item.dataset.correct = String(correct);

  const prompt = document.createElement("h3");
  prompt.textContent = question.prompt;

  const selected = document.createElement("p");
  selected.textContent =
    `Your answer: ${question.choices[selectedIndex]} ` +
    `(${correct ? "Correct" : "Incorrect"})`;

  const answer = document.createElement("p");
  answer.textContent =
    `Correct answer: ${question.choices[question.correctAnswerIndex]}`;

  item.append(prompt);
  appendQuestionImage(item, question);
  item.append(selected, answer);

  return item;
}

export function showQuizResults(body, quiz, answers, score) {
  const total = quiz.questions.length;
  const percentage = Math.round(score / total * 100);
  const results = document.createElement("section");
  results.className = "quiz-results";
  results.setAttribute("aria-labelledby", "quiz-results-heading");

  const heading = document.createElement("h2");
  heading.id = "quiz-results-heading";
  heading.tabIndex = -1;
  heading.textContent = "Quiz results";

  const metrics = document.createElement("div");
  metrics.className = "quiz-result-metrics";
  metrics.append(
    createMetric(`${score} / ${total}`, "Score"),
    createMetric(`${percentage}%`, "Accuracy"),
    createMetric(String(score), "Correct"),
    createMetric(String(total - score), "Incorrect"),
  );

  results.append(heading, metrics);

  const rewardMessage = getRewardMessage(quiz, score, total);

  if (rewardMessage) {
    const reward = document.createElement("p");
    reward.className = "task-completion-summary";
    reward.textContent = rewardMessage;
    results.append(reward);
  }

  const review = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Review answers";

  const list = document.createElement("ol");
  quiz.questions.forEach((question, index) => {
    list.append(createReviewItem(question, answers[index]));
  });

  review.append(summary, list);
  results.append(review);
  body.replaceChildren(results);
  heading.focus();
}