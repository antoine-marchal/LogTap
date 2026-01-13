import Datastore from 'nedb-promises';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

let db = null;
let dbPath = null;

export async function connect(config) {
  if (db) {
    return { db };
  }

  const path = resolve(process.cwd(), config.database.nedb.path);
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = Datastore.create({
    filename: path,
    autoload: true
  });

  dbPath = path;

  await db.ensureIndex({ fieldName: '_receivedAt' });
  await db.ensureIndex({ fieldName: '_ip' });

  return { db };
}

export async function disconnect() {
  db = null;
  dbPath = null;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

export async function isConnected() {
  return db !== null;
}

export async function testConnection(config) {
  try {
    const path = resolve(process.cwd(), config.database.nedb.path);
    const testDb = Datastore.create({
      filename: path,
      autoload: true
    });

    await testDb.find({}).limit(1);

    return {
      success: true,
      message: 'Successfully connected to NeDB',
      path: path
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect: ${error.message}`,
      error: error.code || 'UNKNOWN_ERROR'
    };
  }
}

export async function insertLog(logDocument) {
  const database = getDb();
  const result = await database.insert(logDocument);
  return {
    insertedId: result._id
  };
}

export async function findLogs(filter = {}, options = {}) {
  const database = getDb();
  const { limit = 100, skip = 0, sort = { _receivedAt: -1 } } = options;

  const logs = await database.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return logs;
}

export async function countLogs(filter = {}) {
  const database = getDb();
  return await database.count(filter);
}

export async function findLogById(id) {
  const database = getDb();
  return await database.findOne({ _id: id });
}

export async function deleteLogs(filter = {}) {
  const database = getDb();
  const result = await database.remove(filter, { multi: true });
  return { deletedCount: result };
}

export async function getStats(config) {
  const database = getDb();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalLogs, todayLogs, lastLog] = await Promise.all([
    database.count({}),
    database.count({ _receivedAt: { $gte: startOfDay } }),
    database.find({}).sort({ _receivedAt: -1 }).limit(1)
  ]);

  return {
    totalLogs,
    todayLogs,
    lastLog: lastLog.length > 0 ? lastLog[0]._receivedAt : null,
    database: {
      name: 'NeDB',
      path: dbPath,
      type: 'nedb'
    }
  };
}

export async function clearLogs(config, options = {}) {
  const filter = {};
  if (options.before) {
    filter._receivedAt = { $lt: new Date(options.before) };
  }

  return await deleteLogs(filter);
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
  clearLogs
};
