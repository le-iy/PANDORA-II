const storageKey = "pandora-ii.tasks";

export function readTasks() {
  const tasks = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

  if (!Array.isArray(tasks)) throw new Error("Invalid saved tasks.");

  return tasks;
}

export function writeTasks(tasks) {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

export function changeTask(tasks, id, changes) {
  if (!tasks.some((task) => task?.id === id)) {
    throw new Error("Task no longer exists.");
  }

  return tasks.map((task) => task?.id === id ? { ...task, ...changes } : task);
}