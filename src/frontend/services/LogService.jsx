/**
 * API Service for fetching logs and fields
 */
const LogService = {
  async fetchLogs({ token, skip = 0, limit = 50, search = '', field = '_all', startDate = '', endDate = '' }) {
    const params = new URLSearchParams({
      token,
      limit: limit.toString(),
      skip: skip.toString()
    });

    if (search) params.append('search', search);
    if (field && field !== '_all') params.append('field', field);
    if (startDate) params.append('startDate', new Date(startDate).toISOString());
    if (endDate) params.append('endDate', new Date(endDate).toISOString());

    const response = await fetch('/api/logs?' + params.toString());
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to fetch logs');
    }
    return response.json();
  },

  async fetchFields(token) {
    const response = await fetch('/api/fields?token=' + encodeURIComponent(token));
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to fetch fields');
    }
    return response.json();
  }
};

window.LogService = LogService;
