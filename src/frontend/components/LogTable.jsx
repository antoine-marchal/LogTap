/**
 * Log Table Component - displays logs with infinite scroll
 */

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function LogRow({ log, index, onClick }) {
  const timestamp = new Date(log._receivedAt).toLocaleString();
  const fieldEntries = Object.entries(log).filter(([k]) => !k.startsWith('_'));
  const displayFields = fieldEntries.slice(0, 3);
  const hasMore = fieldEntries.length > 3;

  return (
    <tr className="log-row cursor-pointer fade-in hover:bg-base-200" onClick={onClick}>
      <td>
        <span className="badge badge-ghost badge-sm">{index + 1}</span>
      </td>
      <td className="text-sm">{timestamp}</td>
      <td className="text-sm font-mono">{log._ip || '-'}</td>
      <td>
        {displayFields.map(([key, value]) => (
          <span key={key} className="badge badge-outline badge-sm mr-1">
            {key}: {truncate(String(value), 20)}
          </span>
        ))}
        {hasMore && (
          <span className="badge badge-ghost badge-sm">
            +{fieldEntries.length - 3} more
          </span>
        )}
      </td>
    </tr>
  );
}

function LogTable({ logs, onSelectLog, loading, loadingMore, sentinelRef, total }) {
  if (loading && logs.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-0">
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body p-0">
        <div className="scroll-container">
          <table className="table table-zebra">
            <thead className="sticky top-0 bg-base-200 z-10">
              <tr>
                <th className="w-16">#</th>
                <th>Timestamp</th>
                <th>IP</th>
                <th>Fields</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-base-content/60">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <LogRow
                    key={log._id || index}
                    log={log}
                    index={index}
                    onClick={() => onSelectLog(log)}
                  />
                ))
              )}
            </tbody>
          </table>

          {/* Infinite scroll sentinel */}
          {logs.length > 0 && logs.length < total && (
            <div ref={sentinelRef} className="loading-sentinel flex justify-center py-4">
              {loadingMore && (
                <span className="loading loading-spinner loading-md"></span>
              )}
            </div>
          )}

          {logs.length > 0 && logs.length >= total && (
            <div className="text-center py-4 text-base-content/50 text-sm">
              All {total.toLocaleString()} logs loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.truncate = truncate;
window.LogRow = LogRow;
window.LogTable = LogTable;
