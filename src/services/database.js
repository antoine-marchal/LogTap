import * as mongodbService from './mongodb.js';
import * as nedbService from './nedb.js';
import * as mssqlService from './mssql.js';

let currentService = null;
let currentType = null;

function getService(config) {
  const dbType = config?.database?.type || currentType;

  if (!dbType) {
    throw new Error('Database type not configured');
  }

  if (dbType === 'mongodb') {
    return mongodbService;
  } else if (dbType === 'nedb') {
    return nedbService;
  } else if (dbType === 'mssql') {
    return mssqlService;
  }

  throw new Error(`Unknown database type: ${dbType}`);
}

export async function connect(config) {
  currentType = config.database.type;
  currentService = getService(config);
  return await currentService.connect(config);
}

export async function disconnect() {
  if (currentService) {
    await currentService.disconnect();
    currentService = null;
    currentType = null;
  }
}

export function getDb() {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return currentService.getDb();
}

export async function isConnected() {
  if (!currentService) {
    return false;
  }
  return await currentService.isConnected();
}

export async function testConnection(config) {
  const service = getService(config);
  return await service.testConnection(config);
}

export async function insertLog(logDocument) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.insertLog(logDocument);
}

export async function findLogs(filter = {}, options = {}) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.findLogs(filter, options);
}

export async function countLogs(filter = {}) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.countLogs(filter);
}

export async function findLogById(id) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.findLogById(id);
}

export async function deleteLogs(filter = {}) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.deleteLogs(filter);
}

export async function getStats(config) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.getStats(config);
}

export async function clearLogs(config, options = {}) {
  if (!currentService) {
    throw new Error('Database not connected');
  }
  return await currentService.clearLogs(config, options);
}

export function getDatabaseType() {
  return currentType;
}

export default {
  connect,
  disconnect,
  getDb,
  isConnected,
  testConnection,
  insertLog,
  findLogs,
  countLogs,
  findLogById,
  deleteLogs,
  getStats,
  clearLogs,
  getDatabaseType
};
