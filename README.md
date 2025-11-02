# ⚡ElectricHTML⚡

ElectricHtml is a lightweight JavaScript library that transforms static HTML into live-updating dashboards. Simply tag your HTML elements with custom attributes and let ElectricHtml automatically sync them with your JSON API endpoints in real-time. Inspired by HTMX's philosophy, and built to seamlessly coexist.

## Getting Started

Add ElectricHTML to your HTML file with a single script tag:

```html
<script
    eh-source="http://api.open-notify.org"
    eh-data-route="/iss-now.json"
    eh-interval="1s"
    src="https://cdn.jsdelivr.net/gh/evanjhopkins/ElectricHTML@main/electric-html.js"
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

## Text Decoration

Format your data with prefixes, postfixes, and rounding using additional attributes:

- **`eh-prefix`**: Add text before the value (e.g., currency symbols)
- **`eh-postfix`**: Add text after the value (e.g., units or percent signs)
- **`eh-round`**: Round numerical values to a fixed number of decimal places

### Examples

```html
<!-- Display as "$24.99" with 2 decimal places -->
<div eh-data="price" eh-prefix="$" eh-round="2"></div>

<!-- Display as "87%" with no decimal places -->
<div eh-data="completion_rate" eh-postfix="%" eh-round="0"></div>
```

## Outbound Requests

Send GET requests to your API and handle responses directly from your HTML elements:

- **`eh-get`**: The API route to send a GET request to when the element is interacted with
- **`eh-triggers`**: Triggers a fetch of state after the request completes
- **`eh-provides`**: Indicates the request returns JSON that should update element values (just like polling updates)

### Examples

```html
<!-- Button that triggers a request and refreshes state -->
<button eh-get="/api/increment" eh-triggers>
  Increment Value
</button>

<!-- Button that triggers a request and uses the response to update values -->
<button eh-get="/api/calculate" eh-provides>
  Calculate Value
</button>
```
