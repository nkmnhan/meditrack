// Theme fallback — only runs when no cookie is set (first visit).
// Checks OS prefers-color-scheme and applies .dark if needed.
// When a cookie exists, the server-side Razor code already sets the class.
(function () {
  var html = document.documentElement;
  // Only apply if server didn't already set a theme class
  if (!html.classList.contains("dark") && !html.className.match(/theme-/)) {
    if (matchMedia("(prefers-color-scheme:dark)").matches) {
      html.classList.add("dark");
    }
  }
})();
