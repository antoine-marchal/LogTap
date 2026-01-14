/**
 * Main App Component
 */

function App({ config }) {
  const [theme, setTheme] = useTheme();
  const [logs, setLogs] = React.useState([]);
  const [total, setTotal] = React.useState(-1);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [fields, setFields] = React.useState([]);
  const [selectedLog, setSelectedLog] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const [filters, setFilters] = React.useState({
    search: '',
    field: '_all',
    startDate: '',
    endDate: ''
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  // Fetch available fields from /api/fields
  const fetchFields = React.useCallback(async () => {
    try {
      const data = await LogService.fetchFields(config.TOKEN);
      if (data.fields?.length > 0) {
        setFields(data.fields);
      }
    } catch (err) {
      console.error('Failed to fetch fields:', err.message);
    }
  }, [config.TOKEN]);

  // Fetch logs from API
  const fetchLogs = React.useCallback(async (reset = false) => {
    const skip = reset ? 0 : logs.length;

    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await LogService.fetchLogs({
        token: config.TOKEN,
        skip,
        limit: config.PAGE_SIZE,
        search: debouncedSearch,
        field: filters.field,
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      if (reset) {
        setLogs(data.logs);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
      }

      setTotal(data.total);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [logs.length, debouncedSearch, filters.field, filters.startDate, filters.endDate, config]);

  // Load more logs for infinite scroll
  const loadMore = React.useCallback(() => {
    if (!loadingMore && logs.length < total) {
      fetchLogs(false);
    }
  }, [loadingMore, logs.length, total, fetchLogs]);

  // Infinite scroll sentinel ref
  const sentinelRef = useInfiniteScroll(loadMore, logs.length < total && !loadingMore);

  // Fetch fields on initial load
  React.useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Fetch logs on initial load and auto-refresh
  React.useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => {
      fetchLogs(true);
      fetchFields(); // Also refresh fields periodically
    }, config.AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [debouncedSearch, filters.field, filters.startDate, filters.endDate]);

  // Handlers
  const handleRefresh = () => {
    fetchLogs(true);
    fetchFields();
  };

  const handleClearFilters = () => {
    setFilters({ search: '', field: '_all', startDate: '', endDate: '' });
  };

  const handleApplyFilters = () => fetchLogs(true);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await ExportService.fetchAllLogs({
        token: config.TOKEN,
        search: debouncedSearch,
        field: filters.field,
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      if (data.logs && data.logs.length > 0) {
        ExportService.exportToXlsx(data.logs, filters);
      } else {
        alert('No logs to export');
      }
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <Header
        config={config}
        theme={theme}
        setTheme={setTheme}
        onRefresh={handleRefresh}
      />

      <div className="container mx-auto p-4 max-w-7xl main-content">
        <Stats
          total={total}
          showing={logs.length}
          lastUpdated={lastUpdated}
        />

        <Filters
          filters={filters}
          setFilters={setFilters}
          fields={fields}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          onExport={handleExport}
          exporting={exporting}
        />

        {error ? (
          <div className="alert alert-error mb-6">
            <ErrorIcon />
            <span>Error: {error}</span>
          </div>
        ) : (
          <LogTable
            logs={logs}
            onSelectLog={setSelectedLog}
            loading={loading}
            loadingMore={loadingMore}
            sentinelRef={sentinelRef}
            total={total}
          />
        )}
      </div>

      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
      <ScrollToTop />
    </div>
  );
}

window.App = App;
