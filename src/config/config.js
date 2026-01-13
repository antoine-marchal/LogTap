import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), 'config', 'logtap.config.json');

// Embedded default configuration (for Bun compilation compatibility)
const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  database: {
    type: 'nedb',
    nedb: {
      path: './data/logs.db'
    },
    mongodb: {
      uri: 'mongodb://localhost:27017',
      database: 'logtap',
      collection: 'logs',
      options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      }
    }
  },
  auth: {
    tokens: []
  },
  logging: {
    level: 'info',
    enableConsole: true
  },
  rateLimit: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 100
  },
  cors: {
    enabled: true,
    origin: '*'
  }
};

let cachedConfig = null;
let cachedConfigPath = null;

function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function validateConfig(config) {
  const errors = [];

  if (!config.server) {
    errors.push('Missing server configuration');
  } else {
    if (typeof config.server.port !== 'number' || config.server.port < 1 || config.server.port > 65535) {
      errors.push('Invalid server port (must be 1-65535)');
    }
    if (typeof config.server.host !== 'string') {
      errors.push('Invalid server host');
    }
  }

  if (!config.database) {
    errors.push('Missing database configuration');
  } else {
    const dbType = config.database.type;
    if (!['mongodb', 'nedb'].includes(dbType)) {
      errors.push('Invalid database type (must be "mongodb" or "nedb")');
    }

    if (dbType === 'mongodb') {
      const mongodb = config.database.mongodb;
      if (!mongodb) {
        errors.push('Missing mongodb configuration');
      } else {
        if (!mongodb.uri || typeof mongodb.uri !== 'string') {
          errors.push('Invalid mongodb uri');
        }
        if (!mongodb.database || typeof mongodb.database !== 'string') {
          errors.push('Invalid mongodb database name');
        }
        if (!mongodb.collection || typeof mongodb.collection !== 'string') {
          errors.push('Invalid mongodb collection name');
        }
      }
    }

    if (dbType === 'nedb') {
      const nedb = config.database.nedb;
      if (!nedb) {
        errors.push('Missing nedb configuration');
      } else if (!nedb.path || typeof nedb.path !== 'string') {
        errors.push('Invalid nedb path');
      }
    }
  }

  if (!config.auth) {
    errors.push('Missing auth configuration');
  } else if (!Array.isArray(config.auth.tokens)) {
    errors.push('auth.tokens must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (cachedConfig && cachedConfigPath === configPath) {
    return cachedConfig;
  }

  const defaultConfig = getDefaultConfig();
  let userConfig = {};

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      userConfig = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse config file: ${error.message}`);
    }
  }

  const mergedConfig = deepMerge(defaultConfig, userConfig);
  mergedConfig._path = configPath;

  const validation = validateConfig(mergedConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration:\n  - ${validation.errors.join('\n  - ')}`);
  }

  cachedConfig = mergedConfig;
  cachedConfigPath = configPath;

  return mergedConfig;
}

export function saveConfig(config, configPath = DEFAULT_CONFIG_PATH) {
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const configToSave = { ...config };
  delete configToSave._path;

  writeFileSync(configPath, JSON.stringify(configToSave, null, 2), 'utf-8');

  cachedConfig = null;
  cachedConfigPath = null;
}

export function initConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (existsSync(configPath)) {
    throw new Error(`Config file already exists at ${configPath}`);
  }

  const defaultConfig = getDefaultConfig();
  saveConfig(defaultConfig, configPath);

  return configPath;
}

export function configExists(configPath = DEFAULT_CONFIG_PATH) {
  return existsSync(configPath);
}

export function clearConfigCache() {
  cachedConfig = null;
  cachedConfigPath = null;
}

export function setConfigValue(config, keyPath, value) {
  const keys = keyPath.split('.');
  let current = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  const finalKey = keys[keys.length - 1];

  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (!isNaN(value) && value !== '') value = Number(value);

  current[finalKey] = value;
  return config;
}

export function maskSecrets(config) {
  const masked = JSON.parse(JSON.stringify(config));

  if (masked.auth && masked.auth.tokens) {
    masked.auth.tokens = masked.auth.tokens.map((token) => {
      if (typeof token === 'string' && token.length > 8) {
        return token.substring(0, 4) + '****' + token.substring(token.length - 4);
      }
      return '****';
    });
  }

  if (masked.database?.mongodb?.uri) {
    const uri = masked.database.mongodb.uri;
    const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (match) {
      masked.database.mongodb.uri = `${match[1]}${match[2]}:****@${match[4]}`;
    }
  }

  return masked;
}

export { DEFAULT_CONFIG_PATH, validateConfig };
