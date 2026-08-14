# ⚡ElectricHTML⚡

<p align="center">
  <strong>Turn plain HTML into a live, API-driven interface.</strong>
</p>

<p align="center">
  ElectricHTML is a tiny browser library for binding JSON responses directly to HTML with custom attributes.
  No components, no build step, no virtual DOM.
</p>

<p align="center">
  <a href="https://github.com/evanjhopkins/ElectricHTML/blob/main/LICENSE">MIT License</a>
</p>

## Why ElectricHTML

ElectricHTML is built for simple dashboards, status panels, control surfaces, and lightweight internal tools where you want live data without pulling in a full frontend framework.

- Attribute-driven bindings
- Works with plain HTML
- JSON polling out of the box
- Supports nested object paths
- Built-in text formatting helpers
- Simple action requests with `eh-get`
- Template-based array rendering

## Quick Start

Drop the script into your page and point it at your API:

```html
<script
  eh-source="http://api.open-notify.org"
  eh-data-route="/iss-now.json"
  eh-interval="1s"
  src="https://cdn.jsdelivr.net/gh/evanjhopkins/ElectricHTML@main/electric-html.js"
></script>
```

Bind values anywhere in your markup:

```html
<main>
  <div eh-data="message"></div>
  <div eh-data="timestamp"></div>
  <div eh-data="iss_position.latitude"></div>
  <div eh-data="iss_position.longitude"></div>
</main>
```

If the API returns:

```json
{
  "message": "success",
  "iss_position": {
    "latitude": "51.6110",
    "longitude": "136.5931"
  },
  "timestamp": 1762101842
}
```

ElectricHTML updates the matching elements automatically.

## Mental Model

ElectricHTML watches your configured data endpoint, reads JSON from it, and maps values into the DOM using attribute selectors.

- `eh-source` defines the API origin
- `eh-data-route` defines the JSON endpoint to poll
- `eh-data` maps an element to a JSON path
- `eh-get` lets an element trigger a request

That means you can ship interactive pages with mostly HTML and a small amount of backend JSON.

## Core Example

```html
<script
  eh-source="https://example.com"
  eh-data-route="/api/state"
  src="https://cdn.jsdelivr.net/gh/evanjhopkins/ElectricHTML@main/electric-html.js"
></script>

<section>
  <h1 eh-data="title"></h1>
  <p eh-data="status"></p>
  <p eh-data="metrics.temperature" eh-postfix=" deg" eh-round="1"></p>
</section>
```

## Formatting Values

Use built-in formatting attributes to shape the text before it is inserted.

### Supported attributes

- `eh-prefix`: prepends text
- `eh-postfix`: appends text
- `eh-round`: rounds numeric output with `toFixed`
- `eh-mult`: multiplies numeric values before rendering

### Example

```html
<div eh-data="price" eh-prefix="$" eh-round="2"></div>
<div eh-data="completion_rate" eh-postfix="%" eh-round="0"></div>
<div eh-data="cash_percent" eh-mult="100" eh-round="0" eh-postfix="%"></div>
```

## Triggering Requests

Elements can issue GET requests directly.

### Supported attributes

- `eh-get`: route to request from `eh-source`
- `eh-triggers`: poll state again after the request completes
- `eh-provides`: treat the response body as JSON and immediately update bound values

### Example

```html
<button eh-get="/api/increment" eh-triggers>
  Increment
</button>

<button eh-get="/api/calculate" eh-provides>
  Recalculate
</button>
```

## Rendering Arrays

If an `eh-data` binding resolves to an array, ElectricHTML treats the container's first child as a template and repeats it for each item.

### Example response

```json
{
  "logs": [
    { "timestamp": "2025-11-04 10:32:15", "message": "Server started" },
    { "timestamp": "2025-11-04 10:32:18", "message": "Database connected" },
    { "timestamp": "2025-11-04 10:32:22", "message": "Ready to accept connections" }
  ]
}
```

### Markup

```html
<div eh-data="logs">
  <div>
    <span eh-li="timestamp" eh-prefix="[LOG] "></span>
    <span eh-li="message"></span>
  </div>
</div>
```

## Attribute Reference

| Attribute | Purpose |
| --- | --- |
| `eh-source` | Base URL for API requests |
| `eh-data-route` | Route used for polling JSON state |
| `eh-interval` | Intended polling interval configuration on the script tag |
| `eh-data` | JSON path to bind into an element |
| `eh-get` | Route to request on click |
| `eh-triggers` | Re-fetch state after an action |
| `eh-provides` | Use action response JSON to update bindings |
| `eh-li` | Bind a property inside a repeated array row |
| `eh-prefix` | Add text before a rendered value |
| `eh-postfix` | Add text after a rendered value |
| `eh-round` | Render numbers with fixed decimals |
| `eh-mult` | Multiply a numeric value before rendering |

## Good Fit For

- Lightweight dashboards
- Monitoring pages
- Internal admin tools
- Kiosks and wallboards
- Simple interactive prototypes

## Philosophy

ElectricHTML sits in a small-space sweet spot:

- more dynamic than static HTML
- less overhead than a full SPA
- easy to drop into server-rendered pages

If you like the HTML-first ergonomics of tools like HTMX but want a tiny JSON-to-DOM binding layer, ElectricHTML is aimed at that workflow.

## Status

ElectricHTML is a small, single-file library with a straightforward surface area. It is best suited for focused use cases where simplicity matters more than a large plugin ecosystem.

## License

[MIT](https://github.com/evanjhopkins/ElectricHTML/blob/main/LICENSE)
