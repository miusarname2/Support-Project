import { render } from "preact";
import { Widget } from "./Widget";

// Find the script tag that loaded this widget
function init() {
  const scripts = document.querySelectorAll("script[data-access-key]");
  const currentScript = scripts[scripts.length - 1];

  if (!currentScript) {
    console.error("Own Lovi Widget: No script tag with data-access-key found");
    return;
  }

  const accessKey = currentScript.getAttribute("data-access-key");
  if (!accessKey) {
    console.error("Own Lovi Widget: data-access-key attribute is empty");
    return;
  }

  // Determine API URL: from data attribute, or from the script src domain
  let apiUrl = currentScript.getAttribute("data-api-url");
  if (!apiUrl) {
    const src = currentScript.getAttribute("src");
    if (src) {
      try {
        const url = new URL(src);
        apiUrl = url.origin;
      } catch {
        apiUrl = window.location.origin;
      }
    } else {
      apiUrl = window.location.origin;
    }
  }

  // Create container
  const container = document.createElement("div");
  container.id = "own-lovi-widget-root";
  document.body.appendChild(container);

  // Render widget
  render(<Widget accessKey={accessKey} apiUrl={apiUrl} />, container);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
