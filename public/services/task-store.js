const storageKey = "pandora-ii.tasks";
const archivedRewardsKey = "pandora-ii.archived-task-rewards";
const completionReward = 20;

export function readTasks() {
  const tasks = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

  if (!Array.isArray(tasks)) {
    throw new Error("Invalid saved tasks.");
  }

  return tasks;
}

function readArchivedRewards() {
  const rewards = JSON.parse(localStorage.getItem(archivedRewardsKey) ?? "[]");

  if (!Array.isArray(rewards)) {
    throw new Error("Invalid archived task rewards.");
  }

  return rewards;
}

function isReward(value) {
  return Number.isFinite(value?.exp) &&
    value.exp > 0 &&
    Number.isFinite(Date.parse(value.earnedAt));
}

export function readTaskRewards() {
  const rewards = new Map();

  for (const reward of readArchivedRewards()) {
    if (reward?.id != null && isReward(reward)) {
      rewards.set(reward.id, reward);
    }
  }

  for (const task of readTasks()) {
    if (task?.id != null && isReward(task.reward) && !rewards.has(task.id)) {
      rewards.set(task.id, { id: task.id, ...task.reward });
    }
  }

  return [...rewards.values()];
}

export function writeTasks(tasks) {
  const previous = readTasks();
  const archived = readArchivedRewards();
  const incomingIds = new Set(tasks.map((task) => task?.id));
  const archivedIds = new Set(archived.map((reward) => reward?.id));

  const removedRewards = previous
    .filter((task) =>
      task?.id != null &&
      !incomingIds.has(task.id) &&
      !archivedIds.has(task.id) &&
      isReward(task.reward),
    )
    .map((task) => ({ id: task.id, ...task.reward }));

  if (removedRewards.length) {
    // Preserve the reward before removing its task. Reads deduplicate by task ID.
    localStorage.setItem(
      archivedRewardsKey,
      JSON.stringify([...archived, ...removedRewards]),
    );
  }

  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

export function changeTask(tasks, id, changes) {
  if (!tasks.some((task) => task?.id === id)) {
    throw new Error("Task no longer exists.");
  }

  return tasks.map((task) => {
    if (task?.id !== id) return task;

    const updated = { ...task, ...changes };

    if (!task.completed && updated.completed && !isReward(task.reward)) {
      updated.reward = {
        exp: completionReward,
        earnedAt: updated.completedAt || new Date().toISOString(),
      };
    }

    return updated;
  });
}