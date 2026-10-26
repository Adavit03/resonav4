export function renderErrorPage(error?: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0d0f0c; color: #f0ece1; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.35rem; font-weight: 700; margin: 0 0 0.5rem; color: #fff; }
      p { color: #969387; margin: 0 0 1.5rem; font-size: 13px; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
      a, button { padding: 0.5rem 1.1rem; border-radius: 0.375rem; font: inherit; font-size: 13px; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #d3bc91; color: #0d0f0c; font-weight: 600; }
      .secondary { background: rgba(255,255,255,0.06); color: #fff; border-color: rgba(255,255,255,0.15); }
      .error-box { margin: 12px 0; padding: 10px 14px; background: rgba(248, 113, 113, 0.12); border: 1px solid rgba(248, 113, 113, 0.25); border-radius: 6px; font-size: 11px; color: #fca5a5; text-align: left; font-family: monospace; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      ${msg ? `<div class="error-box">${msg}</div>` : ""}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <button class="secondary" onclick="try{localStorage.clear();}catch(e){}location.href='/'">Clear cache & reload</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
