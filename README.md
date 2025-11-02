# ⚡ElectricHTML⚡

ElectricHtml is a lightweight JavaScript library that transforms static HTML into live-updating dashboards. Simply tag your HTML elements with custom attributes and let ElectricHtml automatically sync them with your JSON API endpoints in real-time. Inspired by HTMX's philosophy, and built to seamlessly coexist.

## Getting Started

Add ElectricHTML to your HTML file with a single script tag:

```html
<script
    eh-source="http://api.open-notify.org"
    eh-data-route="/iss-now.json"
    eh-interval="1s"
    src="https://some-cdn.com/electric-html.js"
></script>
```

### Key Attributes

- **`eh-source`**: The base URL of your API server. ElectricHTML will poll this endpoint for updates.
- **`eh-data-route`**: The API route that returns your JSON state. This endpoint should return the data object that drives your UI.
- **`eh-interval`**: How often to poll for updates (e.g., `1s`, `500ms`, `2s`). Controls the refresh rate of your live data.

### Example API Response

With the configuration above, your API endpoint returns JSON like this:

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

### Binding HTML Elements to Data

Tag your HTML elements with `eh-data` attributes that match your JSON structure:

```html
<div eh-data="timestamp" class="timestamp"></div>
<div eh-data="message"></div>
<div eh-data="iss_position.latitude"></div>
<div eh-data="iss_position.longitude"></div>
```

ElectricHTML will automatically update the content of these elements whenever the API returns new data. Use dot notation to access nested properties.

---

That's the core functionality! However, ElectricHTML offers many more features for advanced use cases outlined below.
