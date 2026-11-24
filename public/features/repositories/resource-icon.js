import { themeAsset } from "../../services/theme-packs.js";


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

  image.src = themeAsset(`icons/resources/${isPdf ? "pdf.svg" : "link.svg"}`);
  wrapper.append(image);

  return wrapper;
}