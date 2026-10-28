// Runs before the page paints: pick the theme so it never flashes.
(function () {
  var t = null;
  try {
    t = localStorage.getItem("tinta-theme");
  } catch (e) {}
  if (t !== "light" && t !== "dark") {
    t = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  var root = document.documentElement;
  root.setAttribute("data-theme", t);
  root.className = root.className.replace("no-js", "js");
})();
