const coursesUrl = new URL("../data/courses.json", import.meta.url);
const storageKey = "pandora-ii.custom-courses";
const namesKey = "pandora-ii.course-names";
const hiddenKey = "pandora-ii.hidden-courses";

export function normalizeCourseCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function normalizeSemester(semester) {
  return semester === "previous" ? "previous" : "current";
}

function readList(key) {
  const values = JSON.parse(localStorage.getItem(key) ?? "[]");

  if (!Array.isArray(values)) {
    throw new Error("Invalid saved course data.");
  }

  return values;
}

function readHiddenCourses() {
  return new Set(readList(hiddenKey).map(normalizeCourseCode).filter(Boolean));
}

function readCourseNames() {
  const names = JSON.parse(localStorage.getItem(namesKey) ?? "{}");

  if (!names || typeof names !== "object" || Array.isArray(names)) {
    throw new Error("Invalid saved course names.");
  }

  return new Map(Object.entries(names));
}

export function hideCourse(code) {
  const courseCode = normalizeCourseCode(code);
  if (!courseCode) throw new Error("Invalid course code.");

  const hidden = readHiddenCourses();
  hidden.add(courseCode);
  localStorage.setItem(hiddenKey, JSON.stringify([...hidden]));
}

export function saveCourseName(code, name) {
  const courseCode = normalizeCourseCode(code);
  const courseName = name.trim();

  if (!courseCode || !courseName || courseName.length > 120) {
    throw new Error("Invalid course name.");
  }

  const names = readCourseNames();
  names.set(courseCode, courseName);
  localStorage.setItem(namesKey, JSON.stringify(Object.fromEntries(names)));

  return courseName;
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

  const hidden = readHiddenCourses();
  let names = new Map();

  try {
    names = readCourseNames();
  } catch (error) {
    console.error("Could not read saved course names.", error);
  }

  const catalog = new Map();

  for (const course of [...bundledCourses, ...readList(storageKey)]) {
    const code = normalizeCourseCode(course?.code);
    if (!code || hidden.has(code) || catalog.has(code)) continue;

    const savedName = names.get(code);

    catalog.set(code, {
      ...course,
      code,
      name: typeof savedName === "string" && savedName.trim()
        ? savedName.trim()
        : course.name,
      semester: normalizeSemester(course.semester),
    });
  }

  return [...catalog.values()];
}

export function saveCustomCourse(course, currentCatalog) {
  const customCourses = readList(storageKey);
  const code = normalizeCourseCode(course.code);
  const name = course.name.trim();

  if (!code || !name || !["lecture", "laboratory"].includes(course.type)) {
    throw new Error("Invalid course details.");
  }

  if (readHiddenCourses().has(code)) {
    throw new Error("This course code belongs to a removed course.");
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