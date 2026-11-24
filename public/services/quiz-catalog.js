const quizzesUrl = new URL("../data/quizzes.json", import.meta.url);
const historyKey = "pandora-ii.quiz-history";
const customQuizzesKey = "pandora-ii.custom-quizzes";

function readList(key) {
  const items = JSON.parse(localStorage.getItem(key) ?? "[]");

  if (!Array.isArray(items)) {
    throw new Error(`Invalid saved data for ${key}.`);
  }

  return items;
}

export function quizRewardKey(quiz) {
  return quiz.originalRewardKey ?? JSON.stringify([quiz.courseCode, quiz.title]);
}

function draftKey(quiz) {
  const identity = [quiz.id ?? null, quiz.courseCode, quiz.title];

  if (quiz.revision) identity.push(quiz.revision);

  return `pandora-ii.quiz-draft.${encodeURIComponent(JSON.stringify(identity))}`;
}

function questionSignature(quiz) {
  return JSON.stringify(quiz.questions.map((question) => [
    question.id,
    question.prompt,
    question.choices,
    question.correctAnswerIndex,
  ]));
}

function clearDraft(quiz, attemptId) {
  try {
    const key = draftKey(quiz);

    if (attemptId !== undefined) {
      const draft = JSON.parse(localStorage.getItem(key) ?? "null");
      if (draft?.attemptId !== attemptId) return;
    }

    localStorage.removeItem(key);
  } catch (error) {
    console.error("Could not clear quiz progress.", error);
  }
}

export async function loadQuizzes({ includeRemoved = false } = {}) {
  const response = await fetch(quizzesUrl);

  if (!response.ok) {
    throw new Error(`Could not load quizzes (${response.status}).`);
  }

  const bundled = await response.json();

  if (!Array.isArray(bundled)) {
    throw new Error("Invalid bundled quiz list.");
  }

  const custom = readList(customQuizzesKey);

  return [
    ...bundled.map((quiz) => ({ ...quiz, source: "bundled" })),
    ...custom.map((quiz) => ({ ...quiz, source: "custom" })),
  ].filter((quiz) =>
    typeof quiz.title === "string" &&
    Array.isArray(quiz.questions) &&
    (includeRemoved || !quiz.removedAt),
  );
}

export function loadQuizHistory() {
  try {
    return readList(historyKey).filter(Boolean);
  } catch (error) {
    console.error("Could not read quiz history.", error);
    return [];
  }
}

export function saveCustomQuiz(quiz) {
  try {
    const quizzes = readList(customQuizzesKey);
    localStorage.setItem(customQuizzesKey, JSON.stringify([...quizzes, quiz]));
    return true;
  } catch (error) {
    console.error("Could not save custom quiz.", error);
    return false;
  }
}

function changeCustomQuiz(original, change) {
  const quizzes = readList(customQuizzesKey);
  const index = quizzes.findIndex((quiz) =>
    quiz?.id === original.id && !quiz.removedAt,
  );

  if (index === -1) throw new Error("The custom quiz no longer exists.");

  const current = quizzes[index];

  if ((current.revision ?? null) !== (original.revision ?? null)) {
    throw new Error("The quiz changed in another tab. Refresh and try again.");
  }

  quizzes[index] = change(current);
  localStorage.setItem(customQuizzesKey, JSON.stringify(quizzes));
  clearDraft(current);
}

function earnedQuizExp(quiz) {
  if (Number.isFinite(quiz.earnedExpReward)) return quiz.earnedExpReward;
  const key = quizRewardKey(quiz);
  const alreadyEarned = readList(historyKey).some((attempt) => {
    if (!attempt || attempt.total <= 0 || attempt.score !== attempt.total) return false;
    const attemptKey = attempt.rewardKey ?? (
      quiz.id != null && attempt.quizId === quiz.id ? key : quizRewardKey(attempt)
    );
    return attemptKey === key;
  });
  return alreadyEarned ? quiz.expReward : undefined;
}

export function updateCustomQuiz(original, details) {
  try {
    changeCustomQuiz(original, (current) => ({
      ...current,
      title: details.title,
      courseCode: details.courseCode,
      questions: details.questions,
      expReward: details.expReward ?? current.expReward,
      earnedExpReward: earnedQuizExp(current),
      originalRewardKey: quizRewardKey(current),
      revision: crypto.randomUUID(),
    }));

    return true;
  } catch (error) {
    console.error("Could not update custom quiz.", error);
    return false;
  }
}

export function removeCustomQuiz(quiz) {
  changeCustomQuiz(quiz, (current) => ({
    id: current.id,
    title: current.title,
    courseCode: current.courseCode,
    expReward: current.expReward,
    earnedExpReward: current.earnedExpReward,
    originalRewardKey: quizRewardKey(current),
    questions: [],
    removedAt: new Date().toISOString(),
  }));
}

export function readQuizDraft(quiz, history = loadQuizHistory()) {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey(quiz)) ?? "null");

    if (
      !draft ||
      typeof draft.attemptId !== "string" ||
      draft.signature !== questionSignature(quiz) ||
      history.some((attempt) => attempt.attemptId === draft.attemptId) ||
      !Number.isInteger(draft.questionIndex) ||
      draft.questionIndex < 0 ||
      draft.questionIndex >= quiz.questions.length ||
      !Array.isArray(draft.answers) ||
      draft.answers.length !== quiz.questions.length
    ) {
      return null;
    }

    const valid = draft.answers.every((answer, index) =>
      answer === null ||
      (Number.isInteger(answer) && answer >= 0 &&
        answer < quiz.questions[index].choices.length),
    );

    return valid ? draft : null;
  } catch (error) {
    console.error("Could not read quiz progress.", error);
    return null;
  }
}

export function saveQuizDraft(quiz, draft) {
  try {
    localStorage.setItem(draftKey(quiz), JSON.stringify({
      attemptId: draft.attemptId,
      questionIndex: draft.questionIndex,
      answers: draft.answers,
      signature: questionSignature(quiz),
    }));

    return true;
  } catch (error) {
    console.error("Could not save quiz progress.", error);
    return false;
  }
}

export function saveQuizAttempt(quiz, score, attemptId) {
  try {
    const history = readList(historyKey);

    if (!history.some((attempt) => attempt?.attemptId === attemptId)) {
      const attempt = {
        attemptId,
        quizId: quiz.id ?? null,
        rewardKey: quizRewardKey(quiz),
        title: quiz.title,
        courseCode: quiz.courseCode,
        score,
        total: quiz.questions.length,
        finishedAt: new Date().toISOString(),
      };

      localStorage.setItem(historyKey, JSON.stringify([attempt, ...history]));
    }
  } catch (error) {
    console.error("Could not save quiz attempt.", error);
    return false;
  }

  clearDraft(quiz, attemptId);
  return true;
}

export function getQuizState(quiz, history) {
  const draft = readQuizDraft(quiz, history);

  if (draft) return { status: "in-progress", draft };

  const completed = history.some((attempt) => {
    if (attempt.quizId != null && quiz.id != null) {
      return attempt.quizId === quiz.id;
    }

    return quizRewardKey(attempt) === quizRewardKey(quiz);
  });

  return { status: completed ? "completed" : "not-started", draft: null };
}