/*! Raumvia Buchungswidget – Einbindung:
 *  <div data-raumvia-room="ihr-raum-slug"></div>
 *  <script src="https://raumvia.ch/widget.js" async></script>
 */
(function () {
  var script = document.currentScript;
  var base = script && script.src ? new URL(script.src).origin : "https://raumvia.ch";
  function mount(el) {
    if (el.getAttribute("data-raumvia-mounted")) return;
    var slug = (el.getAttribute("data-raumvia-room") || "").replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    el.setAttribute("data-raumvia-mounted", "1");
    var iframe = document.createElement("iframe");
    iframe.src = base + "/embed/" + slug;
    iframe.title = "Raum buchen";
    iframe.loading = "lazy";
    iframe.style.cssText = "width:100%;max-width:560px;border:0;min-height:640px;display:block;color-scheme:light";
    iframe.setAttribute("allow", "payment");
    el.appendChild(iframe);
    window.addEventListener("message", function (e) {
      if (e.origin !== base || e.source !== iframe.contentWindow) return;
      if (e.data && e.data.type === "raumvia:height" && typeof e.data.height === "number") {
        iframe.style.height = Math.min(Math.max(e.data.height, 400), 6000) + "px";
      }
    });
  }
  function init() {
    var els = document.querySelectorAll("[data-raumvia-room]");
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
