import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connect, disconnect, getDatabaseType } from './services/database.js';
import { createLogRoutes } from './routes/log.js';
import { errorHandler, notFoundHandler } from './utils/errors.js';
import { writePidFile, removePidFile, log } from './utils/helpers.js';

// Handle both ESM and CJS (esbuild bundle) environments
const getDir = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Ignore - fallback below
  }
  return process.cwd();
};
const __dirname = getDir();

let server = null;

export async function startServer(config, options = {}) {
  const app = express();
  const { verbose = false } = options;

  app.use(helmet({
    contentSecurityPolicy: false
  }));

  if (config.cors?.enabled !== false) {
    app.use(cors({
      origin: config.cors?.origin || '*'
    }));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Serve static assets (DaisyUI, Tailwind)
  app.use('/static', express.static(join(__dirname, 'public')));

  if (config.rateLimit?.enabled) {
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs || 60000,
      max: config.rateLimit.maxRequests || 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: true,
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMITED'
      }
    });
    app.use(limiter);
  }

  if (verbose) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        log('info', `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  const dbType = config.database.type.toUpperCase();
  log('info', `Connecting to ${dbType}...`);
  try {
    await connect(config);
    log('info', `${dbType} connected successfully`);
  } catch (error) {
    log('error', `Failed to connect to ${dbType}: ${error.message}`);
    throw error;
  }

  app.use(createLogRoutes(config));

  app.use(notFoundHandler);
  app.use(errorHandler);

  const { port, host } = config.server;

  return new Promise((resolve, reject) => {
    server = app.listen(port, host, () => {
      writePidFile();
      log('info', `LogTap server running at http://${host}:${port}`);
      log('info', `Log viewer available at http://${host}:${port}/view/<token>`);
      log('info', 'Press Ctrl+C to stop');
      resolve(server);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(error);
      }
    });
  });
}

export async function stopServer() {
  if (server) {
    return new Promise((resolve) => {
      server.close(async () => {
        await disconnect();
        removePidFile();
        log('info', 'Server stopped');
        server = null;
        resolve();
      });
    });
  }
}

export function getServer() {
  return server;
}

export function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    log('info', `Received ${signal}, shutting down gracefully...`);
    await stopServer();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    log('error', 'Unhandled rejection:', reason);
  });
}

export default {
  startServer,
  stopServer,
  getServer,
  setupGracefulShutdown
};
