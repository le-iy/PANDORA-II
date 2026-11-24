export function parseQuestions(text) {
  const questions = [];
  let current;

  function addQuestion() {
    if (!current) return;

    const { number, prompt, choices, answer } = current;

    if (!prompt || choices.length !== 4 || !answer) {
      throw new Error(`Question ${number}: add a prompt, choices A–D, and an Answer: line.`);
    }

    const normalize = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
    const matches = choices
      .map((choice, index) => normalize(choice) === normalize(answer) ? index : -1)
      .filter((index) => index !== -1);
    const letter = /^[A-D]$/i.test(answer) ? "ABCD".indexOf(answer.toUpperCase()) : -1;

    if (matches.length > 1 || (matches.length === 1 && letter !== -1 && matches[0] !== letter)) {
      throw new Error(`Question ${number}: the answer is ambiguous.`);
    }

    const correctAnswerIndex = matches[0] ?? letter;

    if (correctAnswerIndex === -1) {
      throw new Error(`Question ${number}: the answer does not match any choice.`);
    }

    questions.push({ prompt, choices, correctAnswerIndex });
  }

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;

    const question = line.match(/^(\d+)(?:\.\)|\.|\))\s*(.*)$/);

    if (question) {
      addQuestion();
      current = { number: question[1], prompt: question[2], choices: [], answer: "" };
      continue;
    }

    if (!current) throw new Error(`Line ${index + 1}: start with a numbered question.`);

    const choice = line.match(/^([A-D])[.)]\s*(.+)$/i);
    const answer = line.match(/^Answer:\s*(.+)$/i);

    if (choice && !current.answer && choice[1].toUpperCase() === "ABCD"[current.choices.length]) {
      current.choices.push(choice[2]);
    } else if (answer && current.choices.length === 4 && !current.answer) {
      current.answer = answer[1];
    } else {
      throw new Error(
        `Question ${current.number}, line ${index + 1}: expected choices A–D in order, then Answer:.`,
      );
    }
  }

  addQuestion();
  return questions;
}

export function openQuizImport(editor, trigger, onAdd) {
  const dialog = document.createElement("dialog");
  dialog.className = "quiz-preview quiz-flow-dialog";
  dialog.setAttribute("aria-labelledby", "quiz-import-heading");

  dialog.innerHTML = `
    <h2 id="quiz-import-heading">Import questions</h2>
    <div class="quiz-flow-copy">
      <p id="quiz-import-format">
        Paste numbered questions with choices A–D and an Answer: line.
        Use the answer text or its letter.
      </p>

      <label for="quiz-import-text">Questions</label>
      <textarea id="quiz-import-text" rows="10"
        aria-describedby="quiz-import-format" autofocus
        placeholder="1.) Which protocol assigns IP addresses?&#10;A. DNS&#10;B. DHCP&#10;C. SSH&#10;D. FTP&#10;Answer: DHCP"></textarea>

      <p data-import-status aria-live="polite"></p>
      <p>Attach images to individual questions after importing.</p>
    </div>

    <div class="quiz-flow-actions">
      <button type="button" data-cancel-import>Cancel</button>
      <button type="button" class="quiz-flow-primary" data-apply-import disabled>
        Add questions
      </button>
    </div>
  `;

  const input = dialog.querySelector("textarea");
  const status = dialog.querySelector("[data-import-status]");
  const add = dialog.querySelector("[data-apply-import]");
  let questions = [];
  let added = false;

  Object.assign(input.style, {
    boxSizing: "border-box",
    width: "100%",
    minHeight: "10rem",
    resize: "vertical",
    padding: "12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-control)",
    background: "var(--color-background)",
    color: "var(--color-text)",
    fontFamily: "monospace",
  });

  Object.assign(status.style, {
    padding: "8px 12px",
    borderRadius: "var(--radius-control)",
  });

  function validate() {
    questions = [];
    status.style.background = "var(--color-surface-muted)";
    status.style.color = "var(--color-text-muted)";
    input.removeAttribute("aria-invalid");

    try {
      questions = parseQuestions(input.value);
      const count = questions.length;

      status.textContent = count
        ? `${count} ${count === 1 ? "question" : "questions"} ready to add`
        : "Paste questions to check the format.";

      if (count) {
        status.style.background = "var(--color-success-surface)";
        status.style.color = "var(--color-success)";
      }
    } catch (error) {
      status.textContent = error.message;
      status.style.color = "var(--color-danger)";
      input.setAttribute("aria-invalid", "true");
    }

    const count = questions.length;
    add.disabled = count === 0;
    add.style.opacity = add.disabled ? "0.55" : "";
    add.textContent = count
      ? `Add ${count} ${count === 1 ? "question" : "questions"}`
      : "Add questions";
  }

  input.addEventListener("input", validate);
  dialog.querySelector("[data-cancel-import]").addEventListener("click", () => dialog.close());

  add.addEventListener("click", () => {
    if (!questions.length) return;

    added = true;
    dialog.close();
    onAdd(questions);
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (!added && trigger.isConnected) trigger.focus();
  }, { once: true });

  validate();
  editor.append(dialog);
  dialog.showModal();
}