function createProgress(course) {
  const value = Number(course.progress);

  if (course.progress == null || course.progress === "" || !Number.isFinite(value)) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, value));
  const panel = document.createElement("div");
  panel.className = "course-progress";

  const label = document.createElement("p");
  const count = document.createElement("strong");
  count.textContent = `${percentage}%`;
  label.append("Progress", count);

  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = percentage;
  progress.setAttribute("aria-label", `Progress for ${course.name}`);

  panel.append(label, progress);
  return panel;
}

export function createCourseCard(course) {
  const card = document.createElement("article");
  card.className = "course-card";
  card.dataset.courseType = course.type;

  const metadata = document.createElement("div");
  metadata.className = "course-meta";

  const code = document.createElement("p");
  code.className = "course-code";
  code.textContent = course.code;

  const type = document.createElement("p");
  type.className = "course-type";
  type.textContent = course.type === "laboratory" ? "Laboratory" : "Lecture";

  metadata.append(code, type);

  const name = document.createElement("h2");
  name.textContent = course.name;

  const link = document.createElement("a");
  link.className = "course-primary-button";
  link.href = `#/courses/${encodeURIComponent(course.code)}`;
  link.textContent = "Open course";
  link.setAttribute("aria-label", `Open ${course.name}`);

  card.append(metadata, name);

  if (course.semester === "previous") {
    const semester = document.createElement("p");
    semester.className = "course-semester-label";
    semester.textContent = "Previous semester";
    card.append(semester);
  }

  const progress = createProgress(course);
  if (progress) card.append(progress);

  card.append(link);
  return card;
}