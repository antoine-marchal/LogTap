import { insertLog, findLogs, countLogs, findLogById } from './database.js';
import { DatabaseError } from '../utils/errors.js';

export async function storeLog(config, params, metadata) {
  const logDocument = {
    ...metadata,
    ...params
  };

  try {
    const result = await insertLog(logDocument);
    return {
      success: true,
      id: result.insertedId.toString(),
      receivedAt: metadata._receivedAt
    };
  } catch (error) {
    throw new DatabaseError(`Failed to store log: ${error.message}`);
  }
}

export async function queryLogs(config, options = {}) {
  const {
    filter = {},
    limit = 100,
    skip = 0,
    sort = { _receivedAt: -1 }
  } = options;

  try {
    const logs = await findLogs(filter, { limit, skip, sort });
    const total = await countLogs(filter);

    return {
      logs,
      total,
      limit,
      skip,
      hasMore: skip + logs.length < total
    };
  } catch (error) {
    throw new DatabaseError(`Failed to query logs: ${error.message}`);
  }
}

export async function getLogById(config, id) {
  try {
    return await findLogById(id);
  } catch (error) {
    throw new DatabaseError(`Failed to get log: ${error.message}`);
  }
}

export async function getRecentLogs(config, count = 10) {
  return queryLogs(config, { limit: count, sort: { _receivedAt: -1 } });
}

export default {
  storeLog,
  queryLogs,
  getLogById,
  getRecentLogs
};
