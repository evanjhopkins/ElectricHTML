const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deferred,
  element,
  jsonResponse,
  runElectricHtml,
} = require("./helpers/harness");

test("reports a missing eh-source and does not start polling", async () => {
  const harness = await runElectricHtml({ scriptAttributes: {} });

  assert.equal(harness.fetchCalls.length, 0);
  assert.equal(harness.timers.length, 0);
  assert.match(harness.errors[0][0], /eh-source/);
});

test("polls immediately using the configured source and route", async () => {
  const harness = await runElectricHtml({
    fetch: async () => jsonResponse({}),
  });

  assert.deepEqual(harness.fetchCalls, [["https://example.test/state"]]);
});

test("uses a one-second polling interval by default", async () => {
  const harness = await runElectricHtml();

  assert.equal(harness.timers.length, 1);
  assert.equal(harness.timers[0].delay, 1000);
});

for (const [value, expectedDelay] of [
  ["250", 250],
  ["250ms", 250],
  ["1s", 1000],
  ["1.5S", 1500],
  [" 2 s ", 2000],
]) {
  test(`parses an eh-interval of ${JSON.stringify(value)}`, async () => {
    const harness = await runElectricHtml({
      scriptAttributes: {
        "eh-source": "https://example.test",
        "eh-data-route": "/state",
        "eh-interval": value,
      },
    });

    assert.equal(harness.timers[0].delay, expectedDelay);
    assert.equal(harness.errors.length, 0);
  });
}

for (const value of ["", "soon", "0", "-5ms"]) {
  test(`falls back to one second for invalid interval ${JSON.stringify(value)}`, async () => {
    const harness = await runElectricHtml({
      scriptAttributes: {
        "eh-source": "https://example.test",
        "eh-data-route": "/state",
        "eh-interval": value,
      },
    });

    assert.equal(harness.timers[0].delay, 1000);
    assert.match(harness.errors[0][0], /invalid 'eh-interval'/);
  });
}

test("waits for a poll to finish before scheduling the next one", async () => {
  const firstResponse = deferred();
  const secondResponse = deferred();
  let requestCount = 0;
  const harness = await runElectricHtml({
    fetch: () => {
      requestCount += 1;
      return requestCount === 1 ? firstResponse.promise : secondResponse.promise;
    },
  });

  assert.equal(requestCount, 1);
  assert.equal(harness.timers.length, 0);

  firstResponse.resolve(jsonResponse({}));
  await harness.flush();
  assert.equal(harness.timers.length, 1);

  await harness.runNextTimer();
  assert.equal(requestCount, 2);
  assert.equal(harness.timers.length, 0);

  secondResponse.resolve(jsonResponse({}));
  await harness.flush();
  assert.equal(harness.timers.length, 1);
});

test("recovers and schedules another poll after a fetch failure", async () => {
  const failure = new Error("network unavailable");
  const harness = await runElectricHtml({
    fetch: async () => {
      throw failure;
    },
  });

  assert.equal(harness.timers.length, 1);
  assert.equal(harness.errors[0][0], "Polling error:");
  assert.equal(harness.errors[0][1], failure);
});

test("recovers and schedules another poll after invalid response JSON", async () => {
  const failure = new SyntaxError("invalid JSON");
  const harness = await runElectricHtml({
    fetch: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        throw failure;
      },
    }),
  });

  assert.equal(harness.timers.length, 1);
  assert.equal(harness.errors[0][0], "Polling error:");
  assert.equal(harness.errors[0][1], failure);
});

test("does not render an unsuccessful polling response", async () => {
  const status = element("span", { "eh-data": "status" });
  status.textContent = "Last known value";
  let jsonCalled = false;
  const harness = await runElectricHtml({
    elements: [status],
    fetch: async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      async json() {
        jsonCalled = true;
        return { status: "error response" };
      },
    }),
  });

  assert.equal(jsonCalled, false);
  assert.equal(status.textContent, "Last known value");
  assert.equal(harness.timers.length, 1);
  assert.match(
    harness.errors[0][1].message,
    /GET https:\/\/example\.test\/state failed \(500 Internal Server Error\)/,
  );
});

test("renders string, number, zero, and boolean values", async () => {
  const name = element("span", { "eh-data": "name" });
  const count = element("span", { "eh-data": "count" });
  const zero = element("span", { "eh-data": "zero" });
  const active = element("span", { "eh-data": "active" });

  await runElectricHtml({
    elements: [name, count, zero, active],
    fetch: async () =>
      jsonResponse({ name: "ElectricHTML", count: 12, zero: 0, active: false }),
  });

  assert.equal(name.textContent, "ElectricHTML");
  assert.equal(count.textContent, "12");
  assert.equal(zero.textContent, "0");
  assert.equal(active.textContent, "false");
});

test("resolves nested object paths", async () => {
  const value = element("span", { "eh-data": "system.cpu.load" });

  await runElectricHtml({
    elements: [value],
    fetch: async () =>
      jsonResponse({ system: { cpu: { load: 42.5 } } }),
  });

  assert.equal(value.textContent, "42.5");
});

test("leaves existing content unchanged when a path is missing", async () => {
  const value = element("span", { "eh-data": "system.missing" });
  value.textContent = "Waiting";

  await runElectricHtml({
    elements: [value],
    fetch: async () => jsonResponse({ system: {} }),
  });

  assert.equal(value.textContent, "Waiting");
});

test("leaves content unchanged when an intermediate path is not an object", async () => {
  const value = element("span", { "eh-data": "system.status.label" });
  value.textContent = "Waiting";

  await runElectricHtml({
    elements: [value],
    fetch: async () => jsonResponse({ system: { status: "ready" } }),
  });

  assert.equal(value.textContent, "Waiting");
});

test("renders null as empty text", async () => {
  const value = element("span", { "eh-data": "status" });
  value.textContent = "Waiting";

  await runElectricHtml({
    elements: [value],
    fetch: async () => jsonResponse({ status: null }),
  });

  assert.equal(value.textContent, "");
});

test("applies multiplication, rounding, prefix, and postfix in order", async () => {
  const value = element("span", {
    "eh-data": "ratio",
    "eh-mult": "100",
    "eh-round": "1",
    "eh-prefix": "~",
    "eh-postfix": "%",
  });

  await runElectricHtml({
    elements: [value],
    fetch: async () => jsonResponse({ ratio: 0.4567 }),
  });

  assert.equal(value.textContent, "~45.7%");
});

test("rounds numeric strings to the requested precision", async () => {
  const value = element("span", {
    "eh-data": "temperature",
    "eh-round": "2",
  });

  await runElectricHtml({
    elements: [value],
    fetch: async () => jsonResponse({ temperature: "21.376" }),
  });

  assert.equal(value.textContent, "21.38");
});

test("renders one list row per array item and preserves a hidden template", async () => {
  const template = element("div", {}, [
    element("span", { "eh-li": "timestamp" }),
    element("span", { "eh-li": "message" }),
  ]);
  const list = element("div", { "eh-data": "logs" }, [template]);

  await runElectricHtml({
    elements: [list],
    fetch: async () =>
      jsonResponse({
        logs: [
          { timestamp: "10:00", message: "Started" },
          { timestamp: "10:01", message: "Ready" },
        ],
      }),
  });

  assert.equal(list.children.length, 3);
  assert.equal(list.children[0].style.display, "none");
  assert.equal(list.children[1].style.display, "");
  assert.equal(
    list.children[1].querySelector('[eh-li="timestamp"]').textContent,
    "10:00",
  );
  assert.equal(
    list.children[1].querySelector('[eh-li="message"]').textContent,
    "Started",
  );
  assert.equal(
    list.children[2].querySelector('[eh-li="message"]').textContent,
    "Ready",
  );
});

test("renders list properties whose names contain CSS selector characters", async () => {
  const template = element("div", {}, [
    element("span", { "eh-li": 'customer"name' }),
    element("span", { "eh-li": "status]code" }),
  ]);
  const list = element("div", { "eh-data": "items" }, [template]);

  await runElectricHtml({
    elements: [list],
    fetch: async () =>
      jsonResponse({
        items: [
          {
            'customer"name': "Alice",
            "status]code": "ready",
          },
        ],
      }),
  });

  assert.equal(list.children[1].children[0].textContent, "Alice");
  assert.equal(list.children[1].children[1].textContent, "ready");
});

test("updates every list binding that uses the same property", async () => {
  const template = element("div", {}, [
    element("strong", { "eh-li": "name" }),
    element("span", { "eh-li": "name" }),
  ]);
  const list = element("div", { "eh-data": "items" }, [template]);

  await runElectricHtml({
    elements: [list],
    fetch: async () => jsonResponse({ items: [{ name: "ElectricHTML" }] }),
  });

  assert.equal(list.children[1].children[0].textContent, "ElectricHTML");
  assert.equal(list.children[1].children[1].textContent, "ElectricHTML");
});

test("leaves list bindings unchanged when a property is absent", async () => {
  const name = element("span", { "eh-li": "name" });
  name.textContent = "Unknown";
  const template = element("div", {}, [name]);
  const list = element("div", { "eh-data": "items" }, [template]);

  await runElectricHtml({
    elements: [list],
    fetch: async () => jsonResponse({ items: [{}] }),
  });

  assert.equal(list.children[1].children[0].textContent, "Unknown");
});

test("applies value formatting inside list rows", async () => {
  const template = element("div", {}, [
    element("span", {
      "eh-li": "ratio",
      "eh-mult": "100",
      "eh-round": "0",
      "eh-postfix": "%",
    }),
  ]);
  const list = element("div", { "eh-data": "items" }, [template]);

  await runElectricHtml({
    elements: [list],
    fetch: async () => jsonResponse({ items: [{ ratio: 0.42 }] }),
  });

  assert.equal(
    list.children[1].querySelector('[eh-li="ratio"]').textContent,
    "42%",
  );
});

test("replaces old list rows on subsequent polls", async () => {
  const template = element("div", {}, [
    element("span", { "eh-li": "name" }),
  ]);
  const list = element("div", { "eh-data": "items" }, [template]);
  let requestCount = 0;
  const harness = await runElectricHtml({
    elements: [list],
    fetch: async () => {
      requestCount += 1;
      return jsonResponse(
        requestCount === 1
          ? { items: [{ name: "First" }, { name: "Second" }] }
          : { items: [{ name: "Replacement" }] },
      );
    },
  });

  assert.equal(list.children.length, 3);
  await harness.runNextTimer();

  assert.equal(list.children.length, 2);
  assert.equal(
    list.children[1].querySelector('[eh-li="name"]').textContent,
    "Replacement",
  );
});

test("renders an empty array as only the hidden template", async () => {
  const list = element("div", { "eh-data": "items" }, [
    element("div", {}, [element("span", { "eh-li": "name" })]),
  ]);

  await runElectricHtml({
    elements: [list],
    fetch: async () => jsonResponse({ items: [] }),
  });

  assert.equal(list.children.length, 1);
  assert.equal(list.children[0].style.display, "none");
});

test("issues an eh-get request when an initialized element is clicked", async () => {
  const button = element("button", { "eh-get": "/refresh" });
  const harness = await runElectricHtml({ elements: [button] });

  await button.click();

  assert.deepEqual(harness.fetchCalls, [
    ["https://example.test/state"],
    ["https://example.test/refresh"],
  ]);
});

test("preserves an existing application click handler", async () => {
  const button = element("button", { "eh-get": "/refresh" });
  let applicationClickCount = 0;
  const applicationHandler = () => {
    applicationClickCount += 1;
  };
  button.onclick = applicationHandler;
  const harness = await runElectricHtml({ elements: [button] });

  await button.click();

  assert.equal(button.onclick, applicationHandler);
  assert.equal(applicationClickCount, 1);
  assert.equal(harness.fetchCalls.length, 2);
});

test("uses an eh-provides response to update bindings", async () => {
  const status = element("span", { "eh-data": "status" });
  const button = element("button", {
    "eh-get": "/refresh",
    "eh-provides": "",
  });
  const harness = await runElectricHtml({
    elements: [status, button],
    fetch: async (url) =>
      url.endsWith("/refresh")
        ? jsonResponse({ status: "updated" })
        : jsonResponse({ status: "initial" }),
  });

  assert.equal(status.textContent, "initial");
  await button.click();
  assert.equal(status.textContent, "updated");
  assert.equal(harness.fetchCalls.length, 2);
});

test("eh-triggers polls state again after its action request", async () => {
  const status = element("span", { "eh-data": "status" });
  const button = element("button", {
    "eh-get": "/refresh",
    "eh-triggers": "",
  });
  let stateRequestCount = 0;
  const harness = await runElectricHtml({
    elements: [status, button],
    fetch: async (url) => {
      if (url.endsWith("/refresh")) {
        return jsonResponse({});
      }
      stateRequestCount += 1;
      return jsonResponse({
        status: stateRequestCount === 1 ? "initial" : "refreshed",
      });
    },
  });

  await button.click();
  await harness.flush();

  assert.equal(stateRequestCount, 2);
  assert.equal(status.textContent, "refreshed");
  assert.deepEqual(harness.fetchCalls.map(([url]) => url), [
    "https://example.test/state",
    "https://example.test/refresh",
    "https://example.test/state",
  ]);
});

test("an action with both eh-provides and eh-triggers processes both responses", async () => {
  const status = element("span", { "eh-data": "status" });
  const button = element("button", {
    "eh-get": "/refresh",
    "eh-provides": "",
    "eh-triggers": "",
  });
  let stateRequestCount = 0;
  const harness = await runElectricHtml({
    elements: [status, button],
    fetch: async (url) => {
      if (url.endsWith("/refresh")) {
        return jsonResponse({ status: "action" });
      }
      stateRequestCount += 1;
      return jsonResponse({
        status: stateRequestCount === 1 ? "initial" : "polled",
      });
    },
  });

  await button.click();
  await harness.flush();

  assert.equal(stateRequestCount, 2);
  assert.ok(["action", "polled"].includes(status.textContent));
  assert.equal(harness.fetchCalls.length, 3);
});

test("logs action request failures without an unhandled rejection", async () => {
  const failure = new Error("action failed");
  const button = element("button", { "eh-get": "/fail" });
  const harness = await runElectricHtml({
    elements: [button],
    fetch: async (url) => {
      if (url.endsWith("/fail")) {
        throw failure;
      }
      return jsonResponse({});
    },
  });

  await button.click();

  assert.equal(harness.errors[0][0], "Action error:");
  assert.equal(harness.errors[0][1], failure);
});

test("logs unsuccessful actions without providing data or triggering a poll", async () => {
  const status = element("span", { "eh-data": "status" });
  const button = element("button", {
    "eh-get": "/fail",
    "eh-provides": "",
    "eh-triggers": "",
  });
  let stateRequestCount = 0;
  let actionJsonCalled = false;
  const harness = await runElectricHtml({
    elements: [status, button],
    fetch: async (url) => {
      if (url.endsWith("/fail")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          async json() {
            actionJsonCalled = true;
            return { status: "incorrect" };
          },
        };
      }

      stateRequestCount += 1;
      return jsonResponse({ status: "initial" });
    },
  });

  await button.click();
  assert.match(
    harness.errors[0][1].message,
    /GET https:\/\/example\.test\/fail failed \(404 Not Found\)/,
  );
  await harness.flush();

  assert.equal(actionJsonCalled, false);
  assert.equal(stateRequestCount, 1);
  assert.equal(status.textContent, "initial");
  assert.equal(harness.fetchCalls.length, 2);
});
