(function () {
  const electricHtmlScriptTag = document.querySelector("[eh-source]");
  const source = electricHtmlScriptTag?.getAttribute("eh-source");
  const dataRoute = electricHtmlScriptTag?.getAttribute("eh-data-route");
  const intervalRaw = electricHtmlScriptTag?.getAttribute("eh-interval");
  if (!source) {
    console.error("ElectricHtml: 'eh-source' tag not found or had no value");
    return;
  }

  function get(obj, path) {
    if (!obj || typeof obj !== "object" || !path || typeof path !== "string") {
      return undefined;
    }

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object"
      ) {
        return undefined;
      }

      current = current[key];

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }

  async function pollData() {
    try {
      const response = await fetch(`${source}${dataRoute}`);
      const data = await response.json();
      updateValues(data);
    } catch (error) {
      console.error("Polling error:", error);
    }
  }

  function updateValues(data) {
    const dataEls = document.querySelectorAll(`[eh-data]`);
    for (const dataEl of dataEls) {
      const valueKey = dataEl.getAttribute("eh-data");
      const value = get(data, valueKey);
      if (value !== undefined) {
        dataEl.textContent = value;
      }
    }
  }

  function init() {
    const clickEls = document.querySelectorAll(`[eh-get]`);
    for (const clickEl of clickEls) {
      const route = clickEl.getAttribute("eh-get");
      clickEl.onclick = async () => {
        await fetch(`${source}${route}`);
        pollData();
      };
    }
  }

  init();
  // Poll every second
  setInterval(pollData, 1000);
  pollData(); // Initial call
})();
