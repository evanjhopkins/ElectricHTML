# ⚡ElectricHTML⚡

ElectricHtml is a lightweight JavaScript library that transforms static HTML into live-updating dashboards. Simply tag your HTML elements with custom attributes and let ElectricHtml automatically sync them with your JSON API endpoints in real-time. Inspired by HTMX's philosophy, and built to seamlessly coexist.

## Getting Started

Add ElectricHTML to your HTML file with a single script tag:

```html
<script
    eh-source="http://your-api.com"
    eh-data-route="/state"
    eh-interval="1s"
    src="https://some-cdn.com/electric-html.js"
></script>
```

### Key Attributes

- **`eh-source`**: The base URL of your API server. ElectricHTML will poll this endpoint for updates.
- **`eh-data-route`**: The API route that returns your JSON state. This endpoint should return the data object that drives your UI.
- **`eh-interval`**: How often to poll for updates (e.g., `1s`, `500ms`, `2s`). Controls the refresh rate of your live data.
