const pages = [
  { id: "home", label: "Home", icon: "home.svg" },
  { id: "courses", label: "Courses", icon: "courses.svg" },
  { id: "quizzes", label: "Quizzes Tab", icon: "quizzes-tab.svg" },
  { id: "repositories", label: "Repositories", icon: "repositories.svg" },
  { id: "schedule", label: "Schedule", icon: "schedule.svg" },
  { id: "tasks", label: "Tasks", icon: "tasks.svg" },
  { id: "settings", label: "Settings", icon: "settings.svg" },
];

const iconDirectory = new URL("../assets/icons/navigation/", import.meta.url);
const mobileBreakpoint = "(max-width: 720px)";

function createIcon(filename, className) {
  const icon = document.createElement("img");
  icon.className = className;
  icon.src = new URL(filename, iconDirectory).href;
  icon.alt = "";

  icon.addEventListener("error", () => icon.remove(), { once: true });
  return icon;
}

export function renderSidebar(container, activePage = "home") {
  const active = pages.find((page) => page.id === activePage) ?? pages[0];

  const heading = document.createElement("div");
  heading.className = "sidebar-heading";

  const brand = document.createElement("div");
  brand.className = "sidebar-brand";
  brand.innerHTML = `
    <span class="sidebar-brand-title">Dashboard</span>
    <span class="sidebar-brand-subtitle">Study Desk</span>
  `;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sidebar-menu-toggle";
  toggle.setAttribute("aria-controls", "pandora-main-navigation");

  const toggleLabel = document.createElement("span");
  toggle.append(createIcon("menu-button.svg", "sidebar-menu-icon"), toggleLabel);

  const nav = document.createElement("nav");
  nav.id = "pandora-main-navigation";
  nav.className = "sidebar-nav";
  nav.setAttribute("aria-label", "Main navigation");

  function setMenuOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "Close menu" : `Menu · ${active.label}`;
    container.classList.toggle("sidebar-menu-open", open);
  }

  setMenuOpen(false);

  toggle.addEventListener("click", () => {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  for (const page of pages) {
    const link = document.createElement("a");
    link.className = "sidebar-link";
    link.href = `#/${page.id}`;

    const label = document.createElement("span");
    label.textContent = page.label;
    link.append(createIcon(page.icon, "sidebar-link-icon"), label);

    if (page.id === active.id) {
      link.setAttribute("aria-current", "page");
    }

    nav.append(link);
  }

  nav.addEventListener("click", (event) => {
    if (
      !event.target.closest("a") ||
      !window.matchMedia(mobileBreakpoint).matches ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    ) {
      return;
    }

    setMenuOpen(false);
    toggle.focus();
  });

  function closeOnEscape(event) {
    if (
      event.key !== "Escape" ||
      toggle.getAttribute("aria-expanded") !== "true" ||
      !window.matchMedia(mobileBreakpoint).matches
    ) {
      return;
    }

    event.preventDefault();
    setMenuOpen(false);
    toggle.focus();
  }

  heading.addEventListener("keydown", closeOnEscape);
  nav.addEventListener("keydown", closeOnEscape);

  const footer = document.createElement("p");
  footer.className = "sidebar-footer";
  footer.textContent = "PANDORA II";

  heading.append(brand, toggle);
  container.replaceChildren(heading, nav, footer);
}