/**
 * Filters Component - search and filter controls
 */

function Filters({ filters, setFilters, fields, onApply, onClear, onExport, exporting }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <h2 className="card-title mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Search</span>
            </label>
            <input
              type="text"
              placeholder="Search logs..."
              className="input input-bordered"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Field</span>
            </label>
            <select
              className="select select-bordered"
              value={filters.field}
              onChange={(e) => handleChange('field', e.target.value)}
            >
              <option value="_all">All Fields</option>
              <option value="_ip">IP Address</option>
              {fields.map(f => (
                <option key={f} value={f}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Start Date</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered"
              value={filters.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">End Date</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered"
              value={filters.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
        </div>
        <div className="card-actions justify-between mt-4">
          <button
            className="btn btn-success gap-2"
            onClick={onExport}
            disabled={exporting}
          >
            {exporting ? <LoadingIcon /> : <ExportIcon />}
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClear}>
              Clear Filters
            </button>
            <button className="btn btn-primary" onClick={onApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Filters = Filters;
