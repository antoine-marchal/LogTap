import { randomBytes } from 'crypto';
import { loadConfig, saveConfig, clearConfigCache } from '../config/config.js';

const tokenCache = new Map();
const CACHE_TTL = 60000;

export function generateToken(length = 32) {
  return randomBytes(length).toString('hex').slice(0, length);
}

export function validateToken(token, config) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const cacheKey = `${config._path}:${token}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.valid;
  }

  const valid = config.auth.tokens.some(t => {
    if (typeof t === 'string') {
      return t === token;
    }
    return t.token === token;
  });

  tokenCache.set(cacheKey, { valid, timestamp: Date.now() });

  return valid;
}

export function addToken(configPath, token, name = null) {
  clearConfigCache();
  const config = loadConfig(configPath);

  const tokenExists = config.auth.tokens.some(t => {
    if (typeof t === 'string') {
      return t === token;
    }
    return t.token === token;
  });

  if (tokenExists) {
    throw new Error('Token already exists in configuration');
  }

  const tokenEntry = name ? { token, name, createdAt: new Date().toISOString() } : token;

  if (name && config.auth.tokens.some(t => typeof t === 'object' && t.name === name)) {
    throw new Error(`Token with name "${name}" already exists`);
  }

  config.auth.tokens.push(tokenEntry);
  saveConfig(config, configPath);

  tokenCache.clear();

  return tokenEntry;
}

export function removeToken(configPath, identifier) {
  clearConfigCache();
  const config = loadConfig(configPath);

  const initialLength = config.auth.tokens.length;

  config.auth.tokens = config.auth.tokens.filter(t => {
    if (typeof t === 'string') {
      return t !== identifier && !t.startsWith(identifier);
    }
    return t.token !== identifier && t.name !== identifier;
  });

  if (config.auth.tokens.length === initialLength) {
    throw new Error('Token not found');
  }

  saveConfig(config, configPath);
  tokenCache.clear();

  return { removed: initialLength - config.auth.tokens.length };
}

export function listTokens(configPath) {
  clearConfigCache();
  const config = loadConfig(configPath);

  return config.auth.tokens.map((t, index) => {
    if (typeof t === 'string') {
      return {
        index,
        token: maskToken(t),
        name: null,
        createdAt: null
      };
    }
    return {
      index,
      token: maskToken(t.token),
      name: t.name,
      createdAt: t.createdAt
    };
  });
}

export function maskToken(token) {
  if (!token || token.length < 8) {
    return '****';
  }
  return token.substring(0, 4) + '****' + token.substring(token.length - 4);
}

export function clearTokenCache() {
  tokenCache.clear();
}

export function getTokenCount(configPath) {
  clearConfigCache();
  const config = loadConfig(configPath);
  return config.auth.tokens.length;
}

export default {
  generateToken,
  validateToken,
  addToken,
  removeToken,
  listTokens,
  maskToken,
  clearTokenCache,
  getTokenCount
};
