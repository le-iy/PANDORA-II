const coursesUrl = new URL("../data/courses.json", import.meta.url);
const storageKey = "pandora-ii.custom-courses";

export function normalizeCourseCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function normalizeSemester(semester) {
  return semester === "previous" ? "previous" : "current";
}

function readCustomCourses() {
  const courses = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

  if (!Array.isArray(courses)) {
    throw new Error("Invalid saved course list.");
  }

  return courses;
}

export async function loadCourseCatalog() {
  const response = await fetch(coursesUrl);

  if (!response.ok) {
    throw new Error(`Could not load courses (${response.status}).`);
  }

  const bundledCourses = await response.json();

  if (!Array.isArray(bundledCourses)) {
    throw new Error("Invalid course list.");
  }

  const catalog = new Map();

  for (const course of [...bundledCourses, ...readCustomCourses()]) {
    const code = normalizeCourseCode(course?.code);

    if (!code || catalog.has(code)) continue;

    catalog.set(code, {
      ...course,
      code,
      semester: normalizeSemester(course.semester),
    });
  }

  return [...catalog.values()];
}

export function saveCustomCourse(course, currentCatalog) {
  const customCourses = readCustomCourses();
  const code = normalizeCourseCode(course.code);
  const name = course.name.trim();

  if (!code || !name || !["lecture", "laboratory"].includes(course.type)) {
    throw new Error("Invalid course details.");
  }

  const duplicate = [...currentCatalog, ...customCourses].some(
    (existing) => normalizeCourseCode(existing?.code) === code,
  );

  if (duplicate) return false;

  const record = {
    ...course,
    code,
    name,
    semester: normalizeSemester(course.semester),
  };

  localStorage.setItem(storageKey, JSON.stringify([...customCourses, record]));
  return true;
}