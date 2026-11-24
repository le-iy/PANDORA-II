import {
  createCourseIcon,
  getCourseIconChoice,
  openCourseIconPicker,
  saveCourseIconChoice,
} from "./course-icon.js";

function createProgress(course) {
  const value = Number(course.progress);

  if (course.progress == null || course.progress === "" || !Number.isFinite(value)) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, value));
  const panel = document.createElement("div");
  panel.className = "course-progress";

  const label = document.createElement("p");
  const number = document.createElement("strong");
  number.textContent = `${percentage}%`;
  label.append("Progress", number);

  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = percentage;
  progress.setAttribute("aria-label", `Progress for ${course.name}`);

  panel.append(label, progress);
  return panel;
}

function describeCounts({ tasks, quizzes }) {
  return [
    tasks === null ? "Tasks unavailable" : `${tasks} ${tasks === 1 ? "task" : "tasks"}`,
    quizzes === null
      ? "Quizzes unavailable"
      : `${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}`,
  ].join(" · ");
}

export function createCourseCard(course, counts) {
  const card = document.createElement("article");
  card.className = "course-card";
  card.dataset.courseType = course.type;

  const metadata = document.createElement("div");
  metadata.className = "course-meta";

  const identity = document.createElement("div");
  identity.className = "course-card-identity";

  const code = document.createElement("p");
  code.className = "course-code";
  code.textContent = course.code;

  let icon = createCourseIcon(course.code);
  identity.append(icon, code);

  const type = document.createElement("p");
  type.className = "course-type";
  type.textContent = course.type === "laboratory" ? "Laboratory" : "Lecture";
  metadata.append(identity, type);

  const title = document.createElement("h2");
  title.textContent = course.name;
  card.append(metadata, title);

  if (course.semester === "previous") {
    const semester = document.createElement("p");
    semester.className = "course-semester-label";
    semester.textContent = "Previous semester";
    card.append(semester);
  }

  const progress = createProgress(course);
  if (progress) card.append(progress);

  const footer = document.createElement("div");
  footer.className = "course-card-footer";

  const activity = document.createElement("p");
  activity.className = "course-card-counts";
  activity.textContent = counts ? describeCounts(counts) : "Loading activity…";

  const actions = document.createElement("div");
  actions.className = "course-dialog-actions";

  const link = document.createElement("a");
  link.className = "course-primary-button";
  link.href = `#/courses/${encodeURIComponent(course.code)}`;
  link.textContent = "Open course";
  link.setAttribute("aria-label", `Open ${course.name}`);

  const change = document.createElement("button");
  change.type = "button";
  change.className = "course-primary-button";
  change.textContent = "Change icon";
  change.setAttribute("aria-label", `Change icon for ${course.name}`);
  change.setAttribute("aria-haspopup", "dialog");

  Object.assign(change.style, {
    background: "var(--color-surface)",
    color: "var(--color-primary)",
  });

  change.addEventListener("click", () => {
    openCourseIconPicker(change, {
      code: course.code,
      name: course.name,
      choice: getCourseIconChoice(course.code),
      onUse(id) {
        saveCourseIconChoice(course.code, id);
        const nextIcon = createCourseIcon(course.code, id);
        icon.replaceWith(nextIcon);
        icon = nextIcon;
      },
    });
  });

  actions.append(change, link);
  footer.append(activity, actions);
  card.append(footer);

  return {
    element: card,

    updateCounts(nextCounts) {
      activity.textContent = describeCounts(nextCounts);
    },
  };
}