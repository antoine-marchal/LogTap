/**
 * Stats Component - displays log statistics
 */

function Stats({ total, showing, lastUpdated }) {
  return (
    <div className="stats shadow w-full mb-6 bg-base-100">
      <div className="stat">
        <div className="stat-title">Total Logs</div>
        <div className="stat-value text-primary">
          {total >= 0 ? total.toLocaleString() : '-'}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Loaded</div>
        <div className="stat-value text-secondary">
          {showing >= 0 ? showing.toLocaleString() : '-'}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Last Updated</div>
        <div className="stat-value text-sm">{lastUpdated || '-'}</div>
      </div>
    </div>
  );
}

window.Stats = Stats;
