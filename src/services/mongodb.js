import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;
let collectionName = null;

export async function connect(config) {
  if (client && db) {
    return { client, db };
  }

  const { uri, database, collection, options = {} } = config.database.mongodb;

  try {
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(database);
    collectionName = collection;

    await db.command({ ping: 1 });

    await createIndexes();

    return { client, db };
  } catch (error) {
    client = null;
    db = null;
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

export async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collectionName = null;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return db;
}

function getCollection() {
  return getDb().collection(collectionName || 'logs');
}

export async function isConnected() {
  if (!client) {
    return false;
  }

  try {
    await client.db().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function testConnection(config) {
  let testClient = null;

  try {
    const { uri, database, options = {} } = config.database.mongodb;
    testClient = new MongoClient(uri, {
      ...options,
      serverSelectionTimeoutMS: 5000
    });

    await testClient.connect();
    const testDb = testClient.db(database);
    await testDb.command({ ping: 1 });

    const serverInfo = await testDb.admin().serverInfo().catch(() => null);

    return {
      success: true,
      message: 'Successfully connected to MongoDB',
      database: database,
      serverInfo
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect: ${error.message}`,
      error: error.code || 'UNKNOWN_ERROR'
    };
  } finally {
    if (testClient) {
      await testClient.close();
    }
  }
}

export async function insertLog(logDocument) {
  const collection = getCollection();
  const result = await collection.insertOne(logDocument);
  return {
    insertedId: result.insertedId.toString()
  };
}

export async function findLogs(filter = {}, options = {}) {
  const collection = getCollection();
  const { limit = 100, skip = 0, sort = { _receivedAt: -1 } } = options;

  const logs = await collection.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  return logs;
}

export async function countLogs(filter = {}) {
  const collection = getCollection();
  return await collection.countDocuments(filter);
}

export async function findLogById(id) {
  const collection = getCollection();
  try {
    return await collection.findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

export async function deleteLogs(filter = {}) {
  const collection = getCollection();
  const result = await collection.deleteMany(filter);
  return { deletedCount: result.deletedCount };
}

export async function getStats(config) {
  const collection = getCollection();
  const database = getDb();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalLogs, todayLogs, lastLog, dbStats] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ _receivedAt: { $gte: startOfDay } }),
    collection.findOne({}, { sort: { _receivedAt: -1 } }),
    database.stats()
  ]);

  return {
    totalLogs,
    todayLogs,
    lastLog: lastLog ? lastLog._receivedAt : null,
    database: {
      name: database.databaseName,
      type: 'mongodb',
      collections: dbStats.collections,
      dataSize: formatBytes(dbStats.dataSize),
      storageSize: formatBytes(dbStats.storageSize),
      indexes: dbStats.indexes,
      indexSize: formatBytes(dbStats.indexSize)
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

async function createIndexes() {
  const collection = getCollection();

  const indexes = [
    { key: { _receivedAt: -1 }, name: 'idx_receivedAt' },
    { key: { _ip: 1 }, name: 'idx_ip' }
  ];

  for (const index of indexes) {
    try {
      await collection.createIndex(index.key, { name: index.name });
    } catch (error) {
      if (error.code !== 85 && error.code !== 86) {
        console.error(`Failed to create index ${index.name}:`, error.message);
      }
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
