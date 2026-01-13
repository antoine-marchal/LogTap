import { DAISYUI_CSS, TAILWIND_JS } from '../assets/embedded.js';

const VERSION = '1.0.1';

export function getLogViewerHTML(token) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LogTap - Log Viewer</title>
  <style>${DAISYUI_CSS}</style>
  <script>${TAILWIND_JS}</script>
  <style>
    .log-row:hover { background-color: oklch(var(--b2)); }
    .log-details { font-family: monospace; white-space: pre-wrap; word-break: break-all; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  </style>
</head>
<body class="min-h-screen bg-base-200">
  <div class="navbar bg-base-100 shadow-lg sticky top-0 z-50">
    <div class="flex-1">
      <span class="text-xl font-bold px-4">LogTap</span>
      <span class="badge badge-primary">Log Viewer</span>
      <span class="badge badge-ghost ml-2">v${VERSION}</span>
    </div>
    <div class="flex-none gap-2">
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
        </div>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow">
          <li><button onclick="setTheme('light')">Light</button></li>
          <li><button onclick="setTheme('dark')">Dark</button></li>
        </ul>
      </div>
      <button class="btn btn-ghost btn-circle" onclick="fetchLogs()" title="Refresh">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </div>

  <div class="container mx-auto p-4 max-w-7xl">
    <!-- Stats -->
    <div class="stats shadow w-full mb-6 bg-base-100">
      <div class="stat">
        <div class="stat-title">Total Logs</div>
        <div class="stat-value text-primary" id="totalLogs">-</div>
      </div>
      <div class="stat">
        <div class="stat-title">Showing</div>
        <div class="stat-value text-secondary" id="showingLogs">-</div>
      </div>
      <div class="stat">
        <div class="stat-title">Last Updated</div>
        <div class="stat-value text-sm" id="lastUpdated">-</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title mb-4">Filters</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Search</span></label>
            <input type="text" id="searchInput" placeholder="Search logs..." class="input input-bordered" onkeyup="debounceSearch()" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Field</span></label>
            <select id="fieldSelect" class="select select-bordered" onchange="fetchLogs()">
              <option value="_all">All Fields</option>
              <option value="_ip">IP Address</option>
            </select>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Start Date</span></label>
            <input type="datetime-local" id="startDate" class="input input-bordered" onchange="fetchLogs()" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">End Date</span></label>
            <input type="datetime-local" id="endDate" class="input input-bordered" onchange="fetchLogs()" />
          </div>
        </div>
        <div class="card-actions justify-end mt-4">
          <button class="btn btn-ghost" onclick="clearFilters()">Clear Filters</button>
          <button class="btn btn-primary" onclick="fetchLogs()">Apply</button>
        </div>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr class="bg-base-200">
                <th class="w-12"></th>
                <th>Timestamp</th>
                <th>IP</th>
                <th>Fields</th>
              </tr>
            </thead>
            <tbody id="logsTable">
              <tr>
                <td colspan="4" class="text-center py-8">
                  <span class="loading loading-spinner loading-lg"></span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex justify-center mt-6 gap-2">
      <button class="btn btn-outline" id="prevBtn" onclick="prevPage()" disabled>Previous</button>
      <span class="btn btn-ghost" id="pageInfo">Page 1</span>
      <button class="btn btn-outline" id="nextBtn" onclick="nextPage()">Next</button>
    </div>

    <!-- Items per page -->
    <div class="flex justify-center mt-4">
      <div class="join">
        <span class="join-item btn btn-ghost">Per page:</span>
        <button class="join-item btn" onclick="setLimit(25)" id="limit25">25</button>
        <button class="join-item btn btn-active" onclick="setLimit(50)" id="limit50">50</button>
        <button class="join-item btn" onclick="setLimit(100)" id="limit100">100</button>
      </div>
    </div>
  </div>

  <!-- Log Detail Modal -->
  <dialog id="logModal" class="modal">
    <div class="modal-box max-w-3xl">
      <h3 class="font-bold text-lg mb-4">Log Details</h3>
      <pre id="logDetails" class="log-details bg-base-200 p-4 rounded-lg overflow-auto max-h-96"></pre>
      <div class="modal-action">
        <button class="btn btn-ghost" onclick="copyLogDetails()">Copy</button>
        <form method="dialog">
          <button class="btn">Close</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>

  <script>
    const TOKEN = '${token}';
    let currentPage = 1;
    let limit = 50;
    let totalLogs = 0;
    let searchTimeout = null;
    let currentLogData = null;
    let knownFields = new Set();

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('logtap-theme', theme);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('logtap-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }

    function updateFieldDropdown(fields) {
      const select = document.getElementById('fieldSelect');
      const currentValue = select.value;

      // Add new fields to our known set
      fields.forEach(f => knownFields.add(f));

      // Rebuild options preserving All Fields and IP Address at top
      const sortedFields = Array.from(knownFields).sort();

      select.innerHTML = '<option value="_all">All Fields</option><option value="_ip">IP Address</option>';

      sortedFields.forEach(field => {
        const option = document.createElement('option');
        option.value = field;
        option.textContent = field.charAt(0).toUpperCase() + field.slice(1);
        select.appendChild(option);
      });

      // Restore previous selection if it still exists
      if (currentValue) {
        select.value = currentValue;
      }
    }

    async function fetchLogs() {
      const search = document.getElementById('searchInput').value;
      const field = document.getElementById('fieldSelect').value;
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      const skip = (currentPage - 1) * limit;

      const params = new URLSearchParams({
        token: TOKEN,
        limit: limit.toString(),
        skip: skip.toString()
      });

      if (search) params.append('search', search);
      if (field) params.append('field', field);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      document.getElementById('logsTable').innerHTML = \`
        <tr>
          <td colspan="4" class="text-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </td>
        </tr>
      \`;

      try {
        const response = await fetch('/api/logs?' + params.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch logs');
        }

        totalLogs = data.total;
        renderLogs(data.logs);
        updateStats(data);
        updatePagination();

        // Update field dropdown with any new fields
        if (data.fields && data.fields.length > 0) {
          updateFieldDropdown(data.fields);
        }
      } catch (error) {
        document.getElementById('logsTable').innerHTML = \`
          <tr>
            <td colspan="4" class="text-center py-8 text-error">
              Error: \${error.message}
            </td>
          </tr>
        \`;
      }
    }

    function renderLogs(logs) {
      const tbody = document.getElementById('logsTable');

      if (logs.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="4" class="text-center py-8 text-base-content/60">
              No logs found
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = logs.map((log, index) => {
        const timestamp = new Date(log._receivedAt).toLocaleString();
        const fields = Object.keys(log)
          .filter(k => !k.startsWith('_'))
          .slice(0, 3)
          .map(k => \`<span class="badge badge-outline badge-sm mr-1">\${k}: \${truncate(String(log[k]), 20)}</span>\`)
          .join('');
        const moreFields = Object.keys(log).filter(k => !k.startsWith('_')).length > 3
          ? '<span class="badge badge-ghost badge-sm">+more</span>'
          : '';

        return \`
          <tr class="log-row cursor-pointer fade-in" onclick='showLogDetails(\${JSON.stringify(log).replace(/'/g, "\\\\'")})'>
            <td><span class="badge badge-ghost badge-sm">\${(currentPage - 1) * limit + index + 1}</span></td>
            <td class="text-sm">\${timestamp}</td>
            <td class="text-sm font-mono">\${log._ip || '-'}</td>
            <td>\${fields}\${moreFields}</td>
          </tr>
        \`;
      }).join('');
    }

    function truncate(str, len) {
      return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function updateStats(data) {
      document.getElementById('totalLogs').textContent = data.total.toLocaleString();
      document.getElementById('showingLogs').textContent = data.logs.length.toLocaleString();
      document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    }

    function updatePagination() {
      const totalPages = Math.ceil(totalLogs / limit);
      document.getElementById('pageInfo').textContent = \`Page \${currentPage} of \${totalPages || 1}\`;
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        fetchLogs();
      }
    }

    function nextPage() {
      const totalPages = Math.ceil(totalLogs / limit);
      if (currentPage < totalPages) {
        currentPage++;
        fetchLogs();
      }
    }

    function setLimit(newLimit) {
      limit = newLimit;
      currentPage = 1;

      document.querySelectorAll('[id^="limit"]').forEach(btn => btn.classList.remove('btn-active'));
      document.getElementById('limit' + newLimit).classList.add('btn-active');

      fetchLogs();
    }

    function debounceSearch() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        fetchLogs();
      }, 300);
    }

    function clearFilters() {
      document.getElementById('searchInput').value = '';
      document.getElementById('fieldSelect').value = '_all';
      document.getElementById('startDate').value = '';
      document.getElementById('endDate').value = '';
      currentPage = 1;
      fetchLogs();
    }

    function showLogDetails(log) {
      currentLogData = log;
      const formatted = JSON.stringify(log, null, 2);
      document.getElementById('logDetails').textContent = formatted;
      document.getElementById('logModal').showModal();
    }

    function copyLogDetails() {
      if (currentLogData) {
        navigator.clipboard.writeText(JSON.stringify(currentLogData, null, 2));
      }
    }

    // Auto-refresh every 30 seconds
    setInterval(fetchLogs, 30000);

    // Initial load
    fetchLogs();
  </script>
</body>
</html>`;
}

export default { getLogViewerHTML };
