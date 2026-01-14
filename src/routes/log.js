import { Router } from 'express';
import { createAuthMiddleware } from '../middleware/auth.js';
import { validateLogRequest, addMetadata } from '../middleware/validator.js';
import { storeLog, queryLogs } from '../services/logger.js';
import { isConnected, getStats, getDatabaseType } from '../services/database.js';
import { validateToken } from '../services/token.js';
import { createErrorResponse, ErrorCodes } from '../utils/errors.js';
import { formatUptime } from '../utils/helpers.js';
import { getLogViewerHTML } from './viewer.js';
import { DAISYUI_CSS, TAILWIND_JS, FAVICON_BUFFER } from '../assets/embedded.js';

const startTime = Date.now();

export function createLogRoutes(config) {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config);

  router.get('/log',
    authMiddleware,
    validateLogRequest,
    addMetadata,
    async (req, res) => {
      try {
        const result = await storeLog(config, req.logParams, req.logMetadata);

        const response = {
          success: true,
          id: result.id,
          receivedAt: result.receivedAt.toISOString()
        };

        if (req.validationWarnings && req.validationWarnings.length > 0) {
          response.warnings = req.validationWarnings;
        }

        res.status(200).json(response);
      } catch (error) {
        console.error('Error storing log:', error);
        res.status(500).json(
          createErrorResponse('Failed to store log', ErrorCodes.DATABASE_ERROR)
        );
      }
    }
  );

  router.get('/health', async (req, res) => {
    const dbConnected = await isConnected();
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'ok' : 'degraded',
      uptime,
      uptimeFormatted: formatUptime(uptime),
      database: dbConnected ? 'connected' : 'disconnected',
      databaseType: getDatabaseType(),
      timestamp: new Date().toISOString()
    });
  });

  router.get('/ping', (req, res) => {
    res.status(200).json({ pong: true, timestamp: new Date().toISOString() });
  });

  router.get('/stats',
    authMiddleware,
    async (req, res) => {
      try {
        const stats = await getStats(config);
        res.status(200).json({
          success: true,
          ...stats
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json(
          createErrorResponse('Failed to get statistics', ErrorCodes.DATABASE_ERROR)
        );
      }
    }
  );

  router.get('/api/logs',
    authMiddleware,
    async (req, res) => {
      try {
        const {
          limit = 50,
          skip = 0,
          search = '',
          field = '',
          startDate = '',
          endDate = ''
        } = req.query;

        const filter = {};
        const searchLower = search ? search.toLowerCase() : '';

        // Build date filter first (this applies regardless of search)
        if (startDate || endDate) {
          filter._receivedAt = {};
          if (startDate) {
            filter._receivedAt.$gte = new Date(startDate);
          }
          if (endDate) {
            filter._receivedAt.$lte = new Date(endDate);
          }
        }

        let result;

        // Escape special regex characters for safe searching
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (search && field && field !== '_all') {
          // Search in specific field - NeDB requires RegExp object
          filter[field] = { $regex: new RegExp(escapeRegex(search), 'i') };
          result = await queryLogs(config, {
            filter,
            limit: parseInt(limit, 10),
            skip: parseInt(skip, 10),
            sort: { _receivedAt: -1 }
          });
        } else if (search) {
          // Search across all fields - fetch more and filter in app layer
          // This is necessary because NeDB doesn't support dynamic $or on unknown fields
          const fetchLimit = Math.max(parseInt(limit, 10) * 10, 500);
          const allResults = await queryLogs(config, {
            filter,
            limit: fetchLimit,
            skip: 0,
            sort: { _receivedAt: -1 }
          });

          // Filter logs that match the search in any field (key or value)
          const filteredLogs = allResults.logs.filter(log => {
            for (const key in log) {
              // Search in field key
              if (key.toLowerCase().includes(searchLower)) {
                return true;
              }
              // Search in field value
              const val = log[key];
              if (typeof val === 'string' && val.toLowerCase().includes(searchLower)) {
                return true;
              }
              if (typeof val === 'number' && String(val).includes(search)) {
                return true;
              }
            }
            return false;
          });

          // Apply pagination to filtered results
          const skipNum = parseInt(skip, 10);
          const limitNum = parseInt(limit, 10);
          const paginatedLogs = filteredLogs.slice(skipNum, skipNum + limitNum);

          result = {
            logs: paginatedLogs,
            total: filteredLogs.length,
            limit: limitNum,
            skip: skipNum,
            hasMore: skipNum + paginatedLogs.length < filteredLogs.length
          };
        } else {
          // No search - just fetch with pagination
          result = await queryLogs(config, {
            filter,
            limit: parseInt(limit, 10),
            skip: parseInt(skip, 10),
            sort: { _receivedAt: -1 }
          });
        }

        // Extract all unique field names from the returned logs
        const fieldNames = new Set();
        result.logs.forEach(log => {
          Object.keys(log).forEach(key => {
            if (!key.startsWith('_') && key !== 'id') {
              fieldNames.add(key);
            }
          });
        });
        result.fields = Array.from(fieldNames).sort();

        res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json(
          createErrorResponse('Failed to fetch logs', ErrorCodes.DATABASE_ERROR)
        );
      }
    }
  );

  router.get('/api/fields',
    authMiddleware,
    async (req, res) => {
      try {
        // Get a sample of logs to extract field names
        const result = await queryLogs(config, {
          filter: {},
          limit: 500,
          skip: 0,
          sort: { _receivedAt: -1 }
        });

        const fieldNames = new Set();
        result.logs.forEach(log => {
          Object.keys(log).forEach(key => {
            if (!key.startsWith('_') && key !== 'id') {
              fieldNames.add(key);
            }
          });
        });

        res.status(200).json({
          success: true,
          fields: Array.from(fieldNames).sort()
        });
      } catch (error) {
        console.error('Error fetching fields:', error);
        res.status(500).json(
          createErrorResponse('Failed to fetch fields', ErrorCodes.DATABASE_ERROR)
        );
      }
    }
  );
  // Serve favicon
  router.get('/favicon.ico', (req, res) => {
    if (FAVICON_BUFFER) {
      res.set('Content-Type', 'image/x-icon');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(FAVICON_BUFFER);
    } else {
      res.status(404).send('Not found');
    }
  });

  router.get('/', async (req, res) => {
    return res.status(401).send(`
        <!DOCTYPE html>
        <html data-theme="dark">
        <head>
          <title>LogTap - Unauthorized</title>
          <style>${DAISYUI_CSS}</style>
          <script>${TAILWIND_JS}</script>
        </head>
        <body class="min-h-screen flex items-center justify-center bg-base-200">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body items-center text-center">
              <h2 class="card-title text-error">Unauthorized</h2>
              <p>Invalid or missing authentication token.</p>
            </div>
          </div>
        </body>
        </html>
      `);
  });
  router.get('/:token', async (req, res) => {
    const { token } = req.params;

    if (!validateToken(token, config)) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html data-theme="dark">
        <head>
          <title>LogTap - Unauthorized</title>
          <style>${DAISYUI_CSS}</style>
          <script>${TAILWIND_JS}</script>
        </head>
        <body class="min-h-screen flex items-center justify-center bg-base-200">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body items-center text-center">
              <h2 class="card-title text-error">Unauthorized</h2>
              <p>Invalid or missing authentication token.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    res.send(getLogViewerHTML(token));
  });

  return router;
}

export default { createLogRoutes };
