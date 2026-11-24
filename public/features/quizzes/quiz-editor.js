import {
  appendQuestionImage,
  createQuestionFieldset,
} from "./quiz-question-editor.js";
import { openQuizImport } from "./quiz-import.js";

export { appendQuestionImage };

function showQuizPreview(editor, quiz, trigger) {
  const dialog = document.createElement("dialog");
  dialog.className = "quiz-preview";
  dialog.setAttribute("aria-label", "Quiz preview");

  const heading = document.createElement("h2");
  heading.textContent = "Preview quiz";

  const details = document.createElement("p");
  details.dataset.quizDetails = "";
  const count = quiz.questions.length;
  details.textContent =
    `${quiz.title} · ${quiz.courseCode} · ${count} ${count === 1 ? "question" : "questions"}`;

  const list = document.createElement("ol");
  list.dataset.previewQuestions = "";

  for (const question of quiz.questions) {
    const item = document.createElement("li");
    const prompt = document.createElement("h3");
    prompt.textContent = question.prompt;

    const choices = document.createElement("ol");
    choices.type = "A";

    for (const [index, choice] of question.choices.entries()) {
      const option = document.createElement("li");
      option.textContent = index === question.correctAnswerIndex
        ? `${choice} (Correct answer)`
        : choice;
      choices.append(option);
    }

    item.append(prompt);
    appendQuestionImage(item, question);
    item.append(choices);
    list.append(item);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Back to editor";
  close.autofocus = true;
  close.addEventListener("click", () => dialog.close());

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus();
  }, { once: true });

  dialog.append(heading, details, list, close);
  editor.append(dialog);
  dialog.showModal();
}

export function renderQuizEditor(container, { onSave, onCancel, quiz = null }) {
  const editor = document.createElement("section");
  editor.className = "quiz-workspace quiz-editor";

  editor.innerHTML = `
    <header style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px">
      <h1 style="margin:0">${quiz ? "Edit quiz" : "Create quiz"}</h1>
      <button type="button" data-import-questions aria-haspopup="dialog">
        Import questions
      </button>
    </header>

    <form>
      <label>
        Quiz title
        <input name="title" required maxlength="120">
      </label>

      <label>
        Course code
        <input name="courseCode" placeholder="IT0035" required maxlength="12">
      </label>

      <nav class="quiz-question-nav" aria-label="Question navigator">
        <p data-question-count></p>
        <div data-question-links></div>
      </nav>

      <section data-questions aria-label="Quiz questions"></section>

      <button type="button" data-add-question>+ Add question</button>
      <p role="status"></p>

      <div class="quiz-editor-actions">
        <button type="button" data-cancel>Cancel</button>
        <button type="button" data-preview>Preview quiz</button>
        <button type="submit">${quiz ? "Save changes" : "Save quiz"}</button>
      </div>
    </form>
  `;

  const form = editor.querySelector("form");
  const title = form.elements.namedItem("title");
  const course = form.elements.namedItem("courseCode");
  const list = form.querySelector("[data-questions]");
  const count = form.querySelector("[data-question-count]");
  const nav = form.querySelector("[data-question-links]");
  const status = form.querySelector('[role="status"]');
  const preview = form.querySelector("[data-preview]");
  const importButton = editor.querySelector("[data-import-questions]");

  title.value = quiz?.title ?? "";
  course.value = quiz?.courseCode ?? "";

  function markCurrent(fieldset) {
    const index = Array.from(list.children).indexOf(fieldset);

    for (const [position, button] of Array.from(nav.children).entries()) {
      if (position === index) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  }

  function updateNavigator(current) {
    const fieldsets = Array.from(list.children);
    const total = fieldsets.length;
    count.textContent = `${total} ${total === 1 ? "question" : "questions"} added`;

    const buttons = fieldsets.map((fieldset, index) => {
      const label = `Question ${index + 1}`;
      fieldset.querySelector("legend").textContent = label;

      const remove = fieldset.querySelector("[data-remove-question]");
      remove.hidden = total === 1;
      remove.setAttribute("aria-label", `Remove ${label}`);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => fieldset.querySelector("textarea").focus());
      return button;
    });

    nav.replaceChildren(...buttons);
    markCurrent(current);
  }

  function readQuiz() {
    status.textContent = "";

    const quizTitle = title.value.trim();
    const courseCode = course.value.trim().toUpperCase();

    if (!quizTitle || !courseCode) {
      status.textContent = "Enter a quiz title and course code.";
      (quizTitle ? course : title).focus();
      return null;
    }

    const questions = [];

    for (const [index, fieldset] of Array.from(list.children).entries()) {
      const prompt = fieldset.querySelector("textarea");
      const options = Array.from(fieldset.querySelectorAll('[name="choice"]'));
      const answer = fieldset.querySelector("select");
      const alt = fieldset.querySelector('[name="imageAlt"]');

      const choices = options.map((input) => input.value.trim());
      const emptyChoice = choices.indexOf("");
      const imageData = fieldset.querySelector("[data-image-preview]").dataset.imageData;
      const imageAlt = alt.value.trim();

      if (!prompt.value.trim() || emptyChoice !== -1 || answer.value === "") {
        status.textContent = `Complete the prompt, choices, and answer for Question ${index + 1}.`;
        const invalid = prompt.value.trim() ? options[emptyChoice] ?? answer : prompt;
        invalid.focus();
        return null;
      }

      if (imageData && !imageAlt) {
        status.textContent = `Describe the image for Question ${index + 1}.`;
        alt.focus();
        return null;
      }

      questions.push({
        id: `q${index + 1}`,
        prompt: prompt.value.trim(),
        choices,
        correctAnswerIndex: Number(answer.value),
        ...(imageData ? { imageData, imageAlt } : {}),
      });
    }

    return {
      title: quizTitle,
      courseCode,
      expReward: quiz?.expReward ?? 100,
      questions,
    };
  }

  const initialQuestions = quiz?.questions.length ? quiz.questions : [null];
  const firstQuestion = createQuestionFieldset(initialQuestions[0]);
  list.append(firstQuestion);

  for (const question of initialQuestions.slice(1)) {
    list.append(createQuestionFieldset(question));
  }

  updateNavigator(firstQuestion);

  importButton.addEventListener("click", () => {
    openQuizImport(editor, importButton, (questions) => {
      const imported = questions.map((question) => createQuestionFieldset(question));

      const hasEmptyStarter = !quiz &&
        list.children.length === 1 &&
        list.firstElementChild === firstQuestion &&
        [...firstQuestion.querySelectorAll("input, select, textarea")].every(
          (field) => field.type === "file" ? field.files.length === 0 : !field.value,
        ) &&
        !firstQuestion.querySelector("[data-image-preview]").dataset.imageData;

      if (hasEmptyStarter) firstQuestion.remove();

      for (const fieldset of imported) list.append(fieldset);

      updateNavigator(imported[0]);
      const total = imported.length;
      status.textContent = `${total} ${total === 1 ? "question" : "questions"} imported.`;
      imported[0].querySelector("textarea").focus();
    });
  });

  form.querySelector("[data-add-question]").addEventListener("click", () => {
    const fieldset = createQuestionFieldset();
    list.append(fieldset);
    updateNavigator(fieldset);
    fieldset.querySelector("textarea").focus();
  });

  list.addEventListener("focusin", (event) => {
    const fieldset = event.target.closest("fieldset");
    if (fieldset) markCurrent(fieldset);
  });

  list.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-question]");
    if (!remove || list.children.length <= 1) return;

    const fieldset = remove.closest("fieldset");
    const adjacent = fieldset.nextElementSibling ?? fieldset.previousElementSibling;
    fieldset.remove();
    updateNavigator(adjacent);
    adjacent.querySelector("textarea").focus();
  });

  form.querySelector("[data-cancel]").addEventListener("click", onCancel);
  form.addEventListener("input", () => { status.textContent = ""; });

  preview.addEventListener("click", () => {
    if (!form.reportValidity()) return;

    const details = readQuiz();
    if (details) showQuizPreview(editor, details, preview);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const details = readQuiz();
    if (!details) return;

    if (onSave({ id: quiz?.id ?? crypto.randomUUID(), ...details }) === false) {
      status.textContent = "Couldn’t save the quiz. Your entries are still here.";
    }
  });

  container.replaceChildren(editor);
  title.focus();
}