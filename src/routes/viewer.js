import {
  DAISYUI_CSS,
  TAILWIND_JS,
  REACT_JS,
  REACT_DOM_JS,
  BABEL_JS,
  XLSX_JS,
  LOGO_BASE64,
  FRONTEND_JSX
} from '../assets/embedded.js';

const VERSION = '1.0.3';

export function getLogViewerHTML(token) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LogTap - Log Viewer</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <style>${DAISYUI_CSS}</style>
  <style>
    :root { --header-height: 152px; }
    /* Custom color overrides: primary → green, error → gray */
    .btn-primary {
      background-color: #22c55e !important;
      border-color: #22c55e !important;
      color: #fff !important;
    }
    .btn-primary:hover {
      background-color: #16a34a !important;
      border-color: #16a34a !important;
    }
    .btn-secondary {
      background-color: #16a34a !important;
      border-color: #16a34a !important;
      color: #fff !important;
    }
    .btn-secondary:hover {
      background-color: #15803d !important;
      border-color: #15803d !important;
    }
    .text-primary {
      color: #22c55e !important;
    }
    .text-secondary {
      color: #16a34a !important;
    }
    .badge-primary {
      background-color: #22c55e !important;
      border-color: #22c55e !important;
      color: #fff !important;
    }
    .text-error, .alert-error {
      color: #9ca3af !important;
    }
    .btn-error {
      background-color: #6b7280 !important;
      border-color: #6b7280 !important;
    }
    .alert-error {
      background-color: #374151 !important;
      border-color: #4b5563 !important;
    }
    html, body { overflow: hidden; height: 100vh; }
    .log-row:hover { background-color: oklch(var(--b2)); }
    .log-details { font-family: monospace; white-space: pre-wrap; word-break: break-all; }
    .fade-in { animation: fadeIn 0.2s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .main-content { height: calc(100vh - var(--header-height)); overflow-y: auto; }
    .scroll-container { max-height: calc(100vh - var(--header-height) - 450px); overflow-y: auto; }
    .loading-sentinel { height: 1px; }
  </style>
</head>
<body class="min-h-screen bg-base-200">
  <div id="root">
    <div class="flex items-center justify-center min-h-screen">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>

  <!-- Embedded Tailwind -->
  <script>${TAILWIND_JS}</script>

  <!-- Embedded React -->
  <script>${REACT_JS}</script>
  <script>${REACT_DOM_JS}</script>

  <!-- Embedded Babel for JSX compilation -->
  <script>${BABEL_JS}</script>

  <!-- Embedded SheetJS for Excel export -->
  <script>${XLSX_JS}</script>

  <!-- Application Config -->
  <script>
    window.APP_CONFIG = {
      TOKEN: '${token}',
      VERSION: '${VERSION}',
      LOGO: '${LOGO_BASE64}',
      PAGE_SIZE: 50,
      AUTO_REFRESH_INTERVAL: 30000
    };
  </script>

  <!-- JSX Components (compiled by Babel at runtime) -->
  <script type="text/babel" data-presets="react">
${FRONTEND_JSX}

// ========== Bootstrap ==========
ReactDOM.createRoot(document.getElementById('root')).render(
  <App config={window.APP_CONFIG} />
);
  </script>
  
</body>
</html>`;
}

export default { getLogViewerHTML };
