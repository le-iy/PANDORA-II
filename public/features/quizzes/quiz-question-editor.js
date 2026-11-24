const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImageBytes = 300 * 1024;

export function appendQuestionImage(parent, question) {
  if (
    typeof question.imageData !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/i.test(question.imageData)
  ) {
    return;
  }

  const image = document.createElement("img");
  image.src = question.imageData;
  image.alt = question.imageAlt ?? "";
  image.style.display = "block";
  image.style.maxWidth = "100%";
  image.style.maxHeight = "24rem";
  image.style.objectFit = "contain";
  parent.append(image);
}

function wireImageEditor(fieldset, question) {
  const input = fieldset.querySelector('[name="questionImage"]');
  const alt = fieldset.querySelector('[name="imageAlt"]');
  const preview = fieldset.querySelector("[data-image-preview]");
  const remove = fieldset.querySelector("[data-remove-image]");

  let selection = 0;

  function showImage(imageData, imageAlt) {
    preview.replaceChildren();
    delete preview.dataset.imageData;

    if (imageData) {
      appendQuestionImage(preview, { imageData, imageAlt });

      if (preview.firstElementChild) {
        preview.dataset.imageData = imageData;
      }
    }

    const attached = Boolean(preview.dataset.imageData);
    alt.required = attached;
    remove.hidden = !attached;
  }

  alt.value = question?.imageAlt ?? "";
  showImage(question?.imageData, alt.value);

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const current = ++selection;
    remove.hidden = false;

    function showError(message) {
      if (current !== selection) return;
      input.setCustomValidity(message);
      input.reportValidity();
    }

    if (!imageTypes.has(file.type) || file.size > maxImageBytes) {
      showError("Choose a PNG, JPEG, or WebP image up to 300 KB.");
      return;
    }

    input.setCustomValidity("Wait for the image to finish loading.");

    const reader = new FileReader();
    reader.addEventListener("error", () => {
      showError("Couldn’t read this image. Choose another file.");
    }, { once: true });

    reader.addEventListener("load", () => {
      if (current !== selection) return;

      const image = new Image();

      image.addEventListener("load", () => {
        if (current !== selection) return;
        showImage(reader.result, alt.value.trim());
        input.setCustomValidity("");
      }, { once: true });

      image.addEventListener("error", () => {
        showError("Couldn’t open this image. Choose another file.");
      }, { once: true });

      image.src = reader.result;
    }, { once: true });

    reader.readAsDataURL(file);
  });

  alt.addEventListener("input", () => {
    const image = preview.querySelector("img");
    if (image) image.alt = alt.value.trim();
  });

  remove.addEventListener("click", () => {
    selection += 1;
    input.value = "";
    input.setCustomValidity("");
    alt.value = "";
    showImage(null, "");
    input.focus();
  });
}

export function createQuestionFieldset(question = null) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "quiz-editor-question";

  fieldset.innerHTML = `
    <legend></legend>

    <label>
      Question
      <textarea name="prompt" rows="3" required></textarea>
    </label>

    <label>
      Question image (optional)
      <input name="questionImage" type="file" accept="image/png,image/jpeg,image/webp">
    </label>
    <p>PNG, JPEG, or WebP up to 300 KB.</p>

    <label>
      Image description (required when adding an image)
      <input name="imageAlt" maxlength="250">
    </label>

    <div data-image-preview></div>
    <button type="button" data-remove-image hidden>Remove image</button>

    <label>Choice A <input name="choice" required></label>
    <label>Choice B <input name="choice" required></label>
    <label>Choice C <input name="choice" required></label>
    <label>Choice D <input name="choice" required></label>

    <label>
      Correct answer
      <select name="correctAnswerIndex" required>
        <option value="">Choose an answer</option>
        <option value="0">Choice A</option>
        <option value="1">Choice B</option>
        <option value="2">Choice C</option>
        <option value="3">Choice D</option>
      </select>
    </label>

    <button type="button" data-remove-question>Remove question</button>
  `;

  fieldset.querySelector("textarea").value = question?.prompt ?? "";

  for (const [index, input] of fieldset.querySelectorAll('[name="choice"]').entries()) {
    input.value = question?.choices?.[index] ?? "";
  }

  fieldset.querySelector("select").value =
    question?.correctAnswerIndex == null ? "" : String(question.correctAnswerIndex);

  wireImageEditor(fieldset, question);
  return fieldset;
}