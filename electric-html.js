(function () {
  const electricHtmlScriptTag = document.querySelector("[eh-source]");
  const source = electricHtmlScriptTag?.getAttribute("eh-source");
  const dataRoute = electricHtmlScriptTag?.getAttribute("eh-data-route");
  const intervalRaw = electricHtmlScriptTag?.getAttribute("eh-interval");
  if (!source) {
    console.error("ElectricHtml: 'eh-source' tag not found or had no value");
    return;
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
    for (const key in data) {
      const dataEl = document.querySelector(`[eh-data="${key}"]`);
      if (!dataEl) continue;
      const labelEl = dataEl.querySelector("[eh-label]");
      const valueEl = dataEl.querySelector("[eh-value]");
      labelEl.textContent = key;
      valueEl.textContent = data[key];
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
