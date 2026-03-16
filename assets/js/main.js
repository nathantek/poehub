// PoeHUB – liens ouverts dans un nouvel onglet, page actuelle conservée

(function () {
  "use strict";

  document.querySelectorAll(".hub-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = this.getAttribute("href");
      if (href && href.indexOf("#") !== 0) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }
    });
  });
})();
