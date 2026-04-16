// Auto-redirect for native clients — reads URL from meta tag
(function () {
  var meta = document.querySelector('meta[name="redirect-uri"]');
  if (meta && meta.content) {
    window.location = meta.content;
  }
})();
