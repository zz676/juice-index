export default function DocsPage() {
  // Swagger UI is loaded from a CDN to keep dependencies minimal.
  const specUrl = "/api/openapi.json";

  return (
    <main style={{ height: "100vh" }}>
      <div id="swagger-ui" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onload = function() {
              const ui = SwaggerUIBundle({
                url: '${specUrl}',
                dom_id: '#swagger-ui',
                presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
                layout: 'StandaloneLayout'
              });
              window.ui = ui;
            };
          `,
        }}
      />
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" />
    </main>
  );
}
