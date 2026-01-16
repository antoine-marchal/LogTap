#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { unlinkSync } from 'fs';
import {
  loadConfig,
  saveConfig,
  initConfig,
  configExists,
  maskSecrets,
  setConfigValue,
  validateConfig,
  DEFAULT_CONFIG_PATH
} from './config/config.js';
import { startServer, setupGracefulShutdown } from './server.js';
import { generateToken, addToken, removeToken, listTokens } from './services/token.js';
import { testConnection, getStats, clearLogs } from './services/database.js';
import {
  formatUptime,
  formatDate,
  formatNumber,
  readPidFile,
  isProcessRunning,
  log
} from './utils/helpers.js';

const program = new Command();

program
  .name('logtap')
  .description('A lightweight, secure HTTP logging server with MongoDB/NeDB/MSSQL persistence')
  .version('1.0.0');

program
  .command('start')
  .alias('serve')
  .description('Start the LogTap server')
  .option('-p, --port <number>', 'Port number', parseInt)
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .option('-d, --daemon', 'Run as background process')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      const configPath = resolve(options.config);

      if (!configExists(configPath)) {
        console.error(`Config file not found: ${configPath}`);
        console.error('Run "logtap config init" to create one.');
        process.exit(1);
      }

      const config = loadConfig(configPath);

      if (options.port) {
        config.server.port = options.port;
      }

      if (config.auth.tokens.length === 0) {
        console.warn('Warning: No tokens configured. Generate one with "logtap token generate"');
      }

      if (options.daemon) {
        const child = spawn(process.argv[0], [process.argv[1], 'start', '-c', configPath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        console.log(`LogTap started in background (PID: ${child.pid})`);
        process.exit(0);
      }

      setupGracefulShutdown();
      await startServer(config, { verbose: options.verbose });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  });

const tokenCmd = program
  .command('token')
  .description('Token management commands');

tokenCmd
  .command('generate')
  .alias('add')
  .description('Generate a new authentication token')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .option('-n, --name <string>', 'Token identifier/name')
  .option('--length <number>', 'Token length', parseInt, 32)
  .action((options) => {
    try {
      const configPath = resolve(options.config);

      if (!configExists(configPath)) {
        console.error(`Config file not found: ${configPath}`);
        console.error('Run "logtap config init" to create one.');
        process.exit(1);
      }

      const token = generateToken(options.length);
      const result = addToken(configPath, token, options.name);

      console.log('Token generated successfully!');
      console.log('');
      console.log('Token:', token);
      if (options.name) {
        console.log('Name:', options.name);
      }
      console.log('');
      console.log('Save this token securely - it cannot be retrieved later.');
      console.log('');
      console.log(`View logs at: http://localhost:3000/view/${token}`);
    } catch (error) {
      console.error('Failed to generate token:', error.message);
      process.exit(1);
    }
  });

tokenCmd
  .command('list')
  .description('List all tokens (masked)')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action((options) => {
    try {
      const configPath = resolve(options.config);

      if (!configExists(configPath)) {
        console.error(`Config file not found: ${configPath}`);
        process.exit(1);
      }

      const tokens = listTokens(configPath);

      if (tokens.length === 0) {
        console.log('No tokens configured.');
        console.log('Generate one with: logtap token generate');
        return;
      }

      console.log('Configured tokens:');
      console.log('');
      tokens.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.token}`);
        if (t.name) console.log(`     Name: ${t.name}`);
        if (t.createdAt) console.log(`     Created: ${formatDate(t.createdAt)}`);
      });
    } catch (error) {
      console.error('Failed to list tokens:', error.message);
      process.exit(1);
    }
  });

tokenCmd
  .command('remove <identifier>')
  .alias('revoke')
  .description('Remove a token by name or partial match')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action((identifier, options) => {
    try {
      const configPath = resolve(options.config);
      const result = removeToken(configPath, identifier);
      console.log(`Token removed successfully (${result.removed} token(s))`);
    } catch (error) {
      console.error('Failed to remove token:', error.message);
      process.exit(1);
    }
  });

const configCmd = program
  .command('config')
  .description('Configuration management commands');

configCmd
  .command('init')
  .description('Initialize a new config file')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .option('-f, --force', 'Overwrite existing config')
  .action((options) => {
    try {
      const configPath = resolve(options.config);

      if (configExists(configPath) && !options.force) {
        console.error(`Config file already exists: ${configPath}`);
        console.error('Use --force to overwrite.');
        process.exit(1);
      }

      if (options.force && configExists(configPath)) {
        unlinkSync(configPath);
      }

      const path = initConfig(configPath);
      console.log(`Config file created: ${path}`);
      console.log('');
      console.log('Default database: NeDB (file-based, no setup required)');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Generate a token: logtap token generate');
      console.log('  2. Start the server: logtap start');
      console.log('');
      console.log('To use MongoDB instead, edit the config file and set:');
      console.log('  database.type = "mongodb"');
    } catch (error) {
      console.error('Failed to initialize config:', error.message);
      process.exit(1);
    }
  });

configCmd
  .command('validate')
  .description('Validate the configuration file')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action((options) => {
    try {
      const configPath = resolve(options.config);
      const config = loadConfig(configPath);
      const result = validateConfig(config);

      if (result.valid) {
        console.log('Configuration is valid!');
        console.log(`Database type: ${config.database.type}`);
      } else {
        console.error('Configuration errors:');
        result.errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to validate config:', error.message);
      process.exit(1);
    }
  });

configCmd
  .command('show')
  .description('Display current config (secrets masked)')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action((options) => {
    try {
      const configPath = resolve(options.config);
      const config = loadConfig(configPath);
      const masked = maskSecrets(config);
      delete masked._path;
      console.log(JSON.stringify(masked, null, 2));
    } catch (error) {
      console.error('Failed to show config:', error.message);
      process.exit(1);
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Update a config value')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action((key, value, options) => {
    try {
      const configPath = resolve(options.config);
      let config = loadConfig(configPath);
      config = setConfigValue(config, key, value);
      saveConfig(config, configPath);
      console.log(`Set ${key} = ${value}`);
    } catch (error) {
      console.error('Failed to set config value:', error.message);
      process.exit(1);
    }
  });

const dbCmd = program
  .command('db')
  .description('Database management commands');

dbCmd
  .command('test')
  .description('Test database connection')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action(async (options) => {
    try {
      const configPath = resolve(options.config);
      const config = loadConfig(configPath);
      const dbType = config.database.type.toUpperCase();

      console.log(`Testing ${dbType} connection...`);
      const result = await testConnection(config);

      if (result.success) {
        console.log('');
        console.log('Connection successful!');
        if (config.database.type === 'mongodb') {
          console.log(`Database: ${config.database.mongodb.database}`);
          if (result.serverInfo) {
            console.log(`MongoDB version: ${result.serverInfo.version}`);
          }
        } else {
          console.log(`Path: ${result.path}`);
        }
      } else {
        console.error('');
        console.error('Connection failed:', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to test connection:', error.message);
      process.exit(1);
    }
  });

dbCmd
  .command('stats')
  .description('Show database statistics')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .action(async (options) => {
    try {
      const configPath = resolve(options.config);
      const config = loadConfig(configPath);

      const { connect, disconnect } = await import('./services/database.js');
      await connect(config);

      const stats = await getStats(config);

      console.log('Database Statistics');
      console.log('===================');
      console.log('');
      console.log(`Type: ${stats.database.type || config.database.type}`);
      console.log(`Database: ${stats.database.name || stats.database.path}`);
      console.log(`Total logs: ${formatNumber(stats.totalLogs)}`);
      console.log(`Logs today: ${formatNumber(stats.todayLogs)}`);
      console.log(`Last log: ${formatDate(stats.lastLog)}`);

      if (stats.database.dataSize) {
        console.log('');
        console.log('Storage:');
        console.log(`  Data size: ${stats.database.dataSize}`);
        console.log(`  Storage size: ${stats.database.storageSize}`);
        console.log(`  Indexes: ${stats.database.indexes}`);
        console.log(`  Index size: ${stats.database.indexSize}`);
      }

      await disconnect();
    } catch (error) {
      console.error('Failed to get stats:', error.message);
      process.exit(1);
    }
  });

dbCmd
  .command('clear')
  .description('Clear all logs from the database')
  .option('-c, --config <path>', 'Config file path', DEFAULT_CONFIG_PATH)
  .option('--before <date>', 'Clear logs before this date (ISO format)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const configPath = resolve(options.config);
      const config = loadConfig(configPath);

      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise((resolve) => {
          rl.question('Are you sure you want to clear the logs? (yes/no): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('Operation cancelled.');
          return;
        }
      }

      const { connect, disconnect } = await import('./services/database.js');
      await connect(config);

      const result = await clearLogs(config, { before: options.before });

      console.log(`Cleared ${formatNumber(result.deletedCount)} log(s)`);

      await disconnect();
    } catch (error) {
      console.error('Failed to clear logs:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show server status')
  .action(() => {
    const pid = readPidFile();

    if (pid && isProcessRunning(pid)) {
      console.log('LogTap server is running');
      console.log(`PID: ${pid}`);
    } else {
      console.log('LogTap server is not running');
    }
  });

program
  .command('stop')
  .description('Stop the daemon process')
  .action(() => {
    const pid = readPidFile();

    if (!pid) {
      console.log('No PID file found. Server may not be running.');
      return;
    }

    if (!isProcessRunning(pid)) {
      console.log('Server is not running (stale PID file).');
      try {
        unlinkSync('/tmp/logtap.pid');
      } catch {}
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Sent stop signal to process ${pid}`);
    } catch (error) {
      console.error('Failed to stop server:', error.message);
    }
  });

program.parse();
