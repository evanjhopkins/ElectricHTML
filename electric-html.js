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

  function insertValueOnEl(el, value) {
    const roundDecimalsStr = el.getAttribute("eh-round");
    if (roundDecimalsStr !== null) {
      const roundDecimalsInt = parseInt(roundDecimalsStr);
      value = parseFloat(value).toFixed(roundDecimalsInt);
    }

    const prefix = el.getAttribute("eh-prefix");
    if (prefix !== null) {
      value = `${prefix}${value}`;
    }

    const postfix = el.getAttribute("eh-postfix");
    if (postfix !== null) {
      value = `${value}${postfix}`;
    }

    el.textContent = value;
  }

  function attemptResolveList(maybeListEl, value) {
    if (Array.isArray(value)) {
      if (!maybeListEl.firstElementChild) {
        return false;
      }
      const template = maybeListEl.firstElementChild.cloneNode(true);
      template.style.display = "none";

      const newChildren = [template];
      for (const rowData of value) {
        const row = template.cloneNode(true);
        row.style.display = "";

        for (const key in rowData) {
          const rowDataEl = row.querySelector(`[eh-li="${key}"]`);
          if (rowDataEl !== null) {
            insertValueOnEl(rowDataEl, rowData[key]);
          }
          newChildren.push(row);
        }
      }
      maybeListEl.replaceChildren(...newChildren);
      return true;
    }
  }

  function updateValues(data) {
    const dataEls = document.querySelectorAll(`[eh-data]`);
    for (const dataEl of dataEls) {
      const valueKey = dataEl.getAttribute("eh-data");
      let value = get(data, valueKey);
      if (value !== undefined) {
        if (attemptResolveList(dataEl, value)) {
          continue;
        }

        insertValueOnEl(dataEl, value);
      }
    }
  }

  function init() {
    const clickEls = document.querySelectorAll(`[eh-get]`);
    for (const clickEl of clickEls) {
      const route = clickEl.getAttribute("eh-get");
      const triggers = clickEl.hasAttribute("eh-triggers");
      const provides = clickEl.hasAttribute("eh-provides");
      clickEl.onclick = async () => {
        const res = await fetch(`${source}${route}`);
        if (triggers) {
          pollData();
        }
        if (provides) {
          const data = await res.json();
          updateValues(data);
        }
      };
    }
  }

  init();
  // Poll every second
  setInterval(pollData, 1000);
  pollData(); // Initial call
})();
