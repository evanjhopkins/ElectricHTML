const vm = require("node:vm");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const librarySource = readFileSync(
  resolve(__dirname, "../../electric-html.js"),
  "utf8",
);

function parseAttributeSelector(selector) {
  const match = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
  if (!match) {
    throw new Error(`Unsupported test selector: ${selector}`);
  }

  return { name: match[1], value: match[2] };
}

function matchesSelector(element, selector) {
  const { name, value } = parseAttributeSelector(selector);
  if (!element.hasAttribute(name)) {
    return false;
  }

  return value === undefined || element.getAttribute(name) === value;
}

function descendantsOf(elements) {
  const descendants = [];
  for (const element of elements) {
    descendants.push(element);
    descendants.push(...descendantsOf(element.children));
  }
  return descendants;
}

class TestElement {
  constructor(tagName = "div", attributes = {}, children = []) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(
      Object.entries(attributes).map(([name, value]) => [name, String(value)]),
    );
    this.children = children;
    this.style = {};
    this.onclick = null;
    this._textContent = "";
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  get textContent() {
    if (this.children.length > 0) {
      return this.children.map((child) => child.textContent).join("");
    }
    return this._textContent;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = value === null ? "" : String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    return descendantsOf(this.children).filter((element) =>
      matchesSelector(element, selector),
    );
  }

  cloneNode(deep = false) {
    const children = deep
      ? this.children.map((child) => child.cloneNode(true))
      : [];
    const clone = new TestElement(
      this.tagName,
      Object.fromEntries(this.attributes),
      children,
    );
    clone.style = { ...this.style };
    clone._textContent = this._textContent;
    return clone;
  }

  replaceChildren(...children) {
    this.children = children;
    this._textContent = "";
  }
}

class TestDocument {
  constructor(elements = []) {
    this.elements = elements;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    return descendantsOf(this.elements).filter((element) =>
      matchesSelector(element, selector),
    );
  }
}

function element(tagName, attributes, children) {
  return new TestElement(tagName, attributes, children);
}

function jsonResponse(data) {
  return {
    async json() {
      return data;
    },
  };
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function flushAsyncWork() {
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
}

async function runElectricHtml(options = {}) {
  const {
    elements = [],
    fetch: fetchImplementation = async () => jsonResponse({}),
    scriptAttributes = {
      "eh-source": "https://example.test",
      "eh-data-route": "/state",
    },
  } = options;

  const script = new TestElement("script", scriptAttributes);
  const document = new TestDocument([script, ...elements]);
  const fetchCalls = [];
  const errors = [];
  const timers = [];

  const context = {
    console: {
      error(...args) {
        errors.push(args);
      },
    },
    document,
    fetch(...args) {
      fetchCalls.push(args);
      return fetchImplementation(...args);
    },
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
  };

  vm.runInNewContext(librarySource, context, {
    filename: "electric-html.js",
  });
  await flushAsyncWork();

  return {
    document,
    elements,
    errors,
    fetchCalls,
    flush: flushAsyncWork,
    script,
    timers,
    async runNextTimer() {
      const timer = timers.shift();
      if (!timer) {
        throw new Error("No scheduled timer to run");
      }
      timer.callback();
      await flushAsyncWork();
      return timer;
    },
  };
}

module.exports = {
  TestDocument,
  TestElement,
  deferred,
  element,
  jsonResponse,
  runElectricHtml,
};
