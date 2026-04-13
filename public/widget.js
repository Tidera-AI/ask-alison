(function () {
  "use strict";

  var CHAT_URL = window.__ASK_ALISON_URL || "https://ask.elevateetiquette.com";
  var WIDGET_PATH = "/widget";

  var style = document.createElement("style");
  style.textContent = [
    "#ask-alison-bubble {",
    "  position: fixed;",
    "  bottom: 24px;",
    "  right: 24px;",
    "  width: 56px;",
    "  height: 56px;",
    "  border-radius: 50%;",
    "  background: #18181b;",
    "  color: #fff;",
    "  border: none;",
    "  cursor: pointer;",
    "  box-shadow: 0 4px 12px rgba(0,0,0,0.15);",
    "  z-index: 99999;",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  transition: transform 0.2s ease;",
    "  font-size: 24px;",
    "}",
    "#ask-alison-bubble:hover { transform: scale(1.1); }",
    "#ask-alison-panel {",
    "  position: fixed;",
    "  bottom: 96px;",
    "  right: 24px;",
    "  width: 400px;",
    "  height: 600px;",
    "  max-height: calc(100vh - 120px);",
    "  border-radius: 16px;",
    "  overflow: hidden;",
    "  box-shadow: 0 8px 32px rgba(0,0,0,0.2);",
    "  z-index: 99998;",
    "  display: none;",
    "  border: 1px solid #e4e4e7;",
    "}",
    "#ask-alison-panel.open { display: block; }",
    "#ask-alison-panel iframe {",
    "  width: 100%;",
    "  height: 100%;",
    "  border: none;",
    "}",
    "@media (max-width: 480px) {",
    "  #ask-alison-panel {",
    "    bottom: 0;",
    "    right: 0;",
    "    width: 100%;",
    "    height: 100%;",
    "    max-height: 100vh;",
    "    border-radius: 0;",
    "  }",
    "  #ask-alison-bubble.hidden { display: none; }",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  var bubble = document.createElement("button");
  bubble.id = "ask-alison-bubble";
  bubble.setAttribute("aria-label", "Open Ask Alison chat");
  bubble.innerHTML = "\uD83D\uDCAC";
  document.body.appendChild(bubble);

  var panel = document.createElement("div");
  panel.id = "ask-alison-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ask Alison etiquette chat");
  document.body.appendChild(panel);

  var iframe = null;
  var isOpen = false;

  bubble.addEventListener("click", function () {
    isOpen = !isOpen;

    if (isOpen) {
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.src = CHAT_URL + WIDGET_PATH;
        iframe.title = "Ask Alison Chat";
        iframe.setAttribute("allow", "clipboard-write");
        panel.appendChild(iframe);
      }
      panel.classList.add("open");
      bubble.innerHTML = "\u2715";
      bubble.setAttribute("aria-label", "Close Ask Alison chat");
      iframe.focus();
    } else {
      panel.classList.remove("open");
      bubble.innerHTML = "\uD83D\uDCAC";
      bubble.setAttribute("aria-label", "Open Ask Alison chat");
      bubble.classList.remove("hidden");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      bubble.click();
    }
  });
})();
