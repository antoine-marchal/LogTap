/**
 * Export Service for generating XLSX files
 */
const ExportService = {
  async fetchAllLogs({ token, search = '', field = '_all', startDate = '', endDate = '' }) {
    const params = new URLSearchParams({
      token,
      limit: '100000', // Fetch all logs
      skip: '0'
    });

    if (search) params.append('search', search);
    if (field && field !== '_all') params.append('field', field);
    if (startDate) params.append('startDate', new Date(startDate).toISOString());
    if (endDate) params.append('endDate', new Date(endDate).toISOString());

    const response = await fetch('/api/logs?' + params.toString());
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to fetch logs for export');
    }
    return response.json();
  },

  exportToXlsx(logs, filters) {
    if (!logs || logs.length === 0) {
      throw new Error('No logs to export');
    }

    // Get all unique field names from logs (excluding internal fields starting with _)
    const allFields = new Set();
    logs.forEach(log => {
      Object.keys(log).forEach(key => {
        if (!key.startsWith('_') || key === '_ip' || key === '_receivedAt') {
          allFields.add(key);
        }
      });
    });

    // Define column order: timestamp and IP first, then alphabetical
    const priorityFields = ['_receivedAt', '_ip'];
    const otherFields = Array.from(allFields)
      .filter(f => !priorityFields.includes(f))
      .sort();
    const orderedFields = [...priorityFields.filter(f => allFields.has(f)), ...otherFields];

    // Create header row with friendly names
    const headers = orderedFields.map(field => {
      if (field === '_receivedAt') return 'Timestamp';
      if (field === '_ip') return 'IP Address';
      return field.charAt(0).toUpperCase() + field.slice(1);
    });

    // Create data rows
    const rows = logs.map(log => {
      return orderedFields.map(field => {
        const value = log[field];
        if (field === '_receivedAt' && value) {
          return new Date(value).toLocaleString();
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value ?? '';
      });
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = orderedFields.map((field, idx) => {
      const headerLen = headers[idx].length;
      const maxDataLen = Math.max(...rows.map(row => String(row[idx]).length));
      return { wch: Math.min(Math.max(headerLen, maxDataLen, 10), 50) };
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');

    // Create info sheet with export details
    const exportDate = new Date();
    const infoData = [
      ['LogTap Export Report'],
      [],
      ['Export Date', exportDate.toLocaleString()],
      ['Total Records', logs.length.toString()],
      [],
      ['Applied Filters'],
      ['Search', filters.search || '(none)'],
      ['Field', filters.field === '_all' ? 'All Fields' : filters.field],
      ['Start Date', filters.startDate ? new Date(filters.startDate).toLocaleString() : '(none)'],
      ['End Date', filters.endDate ? new Date(filters.endDate).toLocaleString() : '(none)']
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    wsInfo['!cols'] = [{ wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Export Info');

    // Generate filename with date
    const dateStr = exportDate.toISOString().slice(0, 10);
    const timeStr = exportDate.toTimeString().slice(0, 8).replace(/:/g, '-');
    const filename = `logtap-export-${dateStr}_${timeStr}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

    return filename;
  }
};

window.ExportService = ExportService;
