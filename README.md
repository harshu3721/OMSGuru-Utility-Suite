# OMSGuru Utility Suite

A browser-first foundation for internal OMSGuru support and operations utilities.

## Phase 1 included

- Settings storage with safe defaults (browser local storage)
- Structured, exportable logger
- API client with request timeouts, retries, JSON handling, and Oms-Cid/API-key headers
- Browser helpers: DOM creation, toasts, modal, loading state, CSV export
- Reusable searchable table component
- A local API playground with request inspector, JSON formatter, and response viewer

## Run locally

No package installation is required for the current foundation. Open `index.html` in a browser, or use VS Code's **Live Server** extension for the best local-development experience.

Enter your API base URL and credentials in **Settings**. Settings are stored only in the current browser profile. API keys are never logged.

## Project layout

```
src/
  api/        HTTP client and request helpers
  core/       settings, logging, JSON utilities
  ui/         reusable browser components
  app.js      utility launcher and API playground
```

## Safety notes

- This is a client-side developer/support toolkit. Only use authorised OMSGuru endpoints and credentials.
- Do not put credentials in source files or commit them to Git.
- Browsers enforce CORS. If an API blocks requests from the browser, a future server-side proxy should be added rather than bypassing access controls.
