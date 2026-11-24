const detailParameters = {
  courses: "courseCode",
  quizzes: "quizId",
};

export function startRouter(pageIds, renderPage) {
  const validPages = new Set(pageIds);

  function handleRoute() {
    const hash = window.location.hash;
    const requested = hash.startsWith("#/") ? hash.slice(2) : "";
    const parts = requested.split("/");
    const [pageId, encodedId] = parts;

    if (parts.length === 1 && validPages.has(pageId)) {
      renderPage(pageId);
      return;
    }

    const parameter = Object.hasOwn(detailParameters, pageId)
      ? detailParameters[pageId]
      : null;

    if (parts.length === 2 && validPages.has(pageId) && parameter && encodedId) {
      let id;

      try {
        id = decodeURIComponent(encodedId).trim();
      } catch {
        // Unreadable route parameters fall back to Home.
      }

      if (id) {
        renderPage(pageId, { [parameter]: id });
        return;
      }
    }

    renderPage("home");
  }

  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}