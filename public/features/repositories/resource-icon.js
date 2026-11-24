const iconDirectory = new URL("../../assets/icons/resources/", import.meta.url);

export function createResourceIcon(resource) {
  const isPdf = resource.type === "pdf";
  const wrapper = document.createElement("span");

  wrapper.className = "resource-file-icon";
  wrapper.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.width = 24;
  image.height = 24;
  image.alt = "";

  image.addEventListener("error", () => {
    wrapper.textContent = isPdf ? "PDF" : "↗";
  }, { once: true });

  image.src = new URL(isPdf ? "pdf.svg" : "link.svg", iconDirectory).href;
  wrapper.append(image);

  return wrapper;
}