const typeFilters = [
  { id: "all", label: "All courses" },
  { id: "lecture", label: "Lecture" },
  { id: "laboratory", label: "Laboratory" },
];

export function createCourseFilters(typeBar, semesterSelect, onChange) {
  let activeType = "all";
  const buttons = new Map();

  for (const filter of typeFilters) {
    const button = document.createElement("button");
    button.type = "button";

    button.addEventListener("click", () => {
      activeType = filter.id;
      onChange();
    });

    buttons.set(filter.id, button);
    typeBar.append(button);
  }

  semesterSelect.addEventListener("change", onChange);

  return {
    get semester() {
      return semesterSelect.value;
    },

    revealCourse(course) {
      activeType = "all";

      if (semesterSelect.value !== "all") {
        semesterSelect.value = course.semester;
      }
    },

    apply(courses) {
      const semester = semesterSelect.value;
      const matchingSemester = semester === "all"
        ? courses
        : courses.filter((course) => course.semester === semester);

      for (const filter of typeFilters) {
        const count = filter.id === "all"
          ? matchingSemester.length
          : matchingSemester.filter((course) => course.type === filter.id).length;

        const button = buttons.get(filter.id);
        button.textContent = `${filter.label} (${count})`;
        button.setAttribute("aria-pressed", String(activeType === filter.id));
      }

      return activeType === "all"
        ? matchingSemester
        : matchingSemester.filter((course) => course.type === activeType);
    },
  };
}