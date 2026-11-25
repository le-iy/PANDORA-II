import { themeAsset } from "../../services/theme-packs.js";


export function createResourceIcon(resource) {
  const isPdf = resource.type === "pdf";
  const wrapper = document.createElement("span");

  wrapper.className = "resource-file-icon";
  wrapper.setAttribute("aria-hidden", "true"); if(resource.type !== "pdf" && resource.type !== "link"){const label=document.createElement("span");label.textContent=(resource.filename?.split(".").pop() || resource.type).toUpperCase();label.style.fontSize=".625rem";label.style.fontWeight="700";wrapper.append(label);return wrapper;}

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