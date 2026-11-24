export function createQuizNavigator(total, onSelect) {
  const navigator = document.createElement("nav");
  navigator.className = "quiz-attempt-navigator";
  navigator.setAttribute("aria-label", "Quiz question navigator");

  const heading = document.createElement("h2");
  heading.textContent = "Questions";

  const summary = document.createElement("p");
  summary.setAttribute("role", "status");

  const progress = document.createElement("progress");
  progress.max = total;
  progress.value = 0;
  progress.setAttribute("aria-label", "Questions answered");

  const grid = document.createElement("div");
  grid.className = "quiz-question-grid";

  const buttons = Array.from({ length: total }, (_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(index + 1);
    button.addEventListener("click", () => onSelect(index));
    grid.append(button);
    return button;
  });

  navigator.append(heading, summary, progress, grid);

  return {
    element: navigator,

    update(currentIndex, answers) {
      const answered = answers.filter((answer) => answer !== null).length;
      const text = `${answered} of ${total} answered`;

      if (summary.textContent !== text) summary.textContent = text;

      progress.value = answered;

      for (const [index, button] of buttons.entries()) {
        const hasAnswer = answers[index] !== null;
        button.toggleAttribute("data-answered", hasAnswer);

        button.setAttribute(
          "aria-label",
          `Question ${index + 1}, ${hasAnswer ? "answered" : "unanswered"}`,
        );

        if (index === currentIndex) {
          button.setAttribute("aria-current", "step");
        } else {
          button.removeAttribute("aria-current");
        }
      }
    },
  };
}