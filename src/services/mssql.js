import sql from 'mssql';

let pool = null;
let config = null;

const TABLE_NAME = 'Logs';

const CREATE_TABLE_SQL = `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '${TABLE_NAME}')
BEGIN
  CREATE TABLE ${TABLE_NAME} (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    receivedAt DATETIME2 NOT NULL,
    ip NVARCHAR(50) NULL,
    userAgent NVARCHAR(500) NULL,
    log NVARCHAR(MAX) NOT NULL
  );
  CREATE INDEX idx_receivedAt ON ${TABLE_NAME} (receivedAt DESC);
  CREATE INDEX idx_ip ON ${TABLE_NAME} (ip);
END
`;

export async function connect(dbConfig) {
  if (pool) {
    return { pool };
  }

  const { server, database, user, password, port = 1433, options = {} } = dbConfig.database.mssql;

  config = {
    server,
    database,
    user,
    password,
    port,
    options: {
      encrypt: options.encrypt ?? true,
      trustServerCertificate: options.trustServerCertificate ?? false,
      ...options
    }
  };

  try {
    pool = await sql.connect(config);

    // Create table if not exists
    await pool.request().query(CREATE_TABLE_SQL);

    return { pool };
  } catch (error) {
    pool = null;
    throw new Error(`Failed to connect to MSSQL: ${error.message}`);
  }
}

export async function disconnect() {
  if (pool) {
    await pool.close();
    pool = null;
    config = null;
  }
}

export function getDb() {
  if (!pool) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return pool;
}

export async function isConnected() {
  if (!pool) {
    return false;
  }

  try {
    await pool.request().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function testConnection(dbConfig) {
  let testPool = null;

  try {
    const { server, database, user, password, port = 1433, options = {} } = dbConfig.database.mssql;

    const testConfig = {
      server,
      database,
      user,
      password,
      port,
      options: {
        encrypt: options.encrypt ?? true,
        trustServerCertificate: options.trustServerCertificate ?? false,
        connectionTimeout: 5000,
        ...options
      }
    };

    testPool = await sql.connect(testConfig);
    const result = await testPool.request().query('SELECT @@VERSION as version');

    return {
      success: true,
      message: 'Successfully connected to MSSQL',
      database: database,
      serverInfo: {
        version: result.recordset[0]?.version
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect: ${error.message}`,
      error: error.code || 'UNKNOWN_ERROR'
    };
  } finally {
    if (testPool) {
      await testPool.close();
    }
  }
}

export async function insertLog(logDocument) {
  const database = getDb();

  const receivedAt = logDocument._receivedAt || new Date();
  const ip = logDocument._ip || null;
  const userAgent = logDocument._userAgent || null;

  // Store entire document as JSON in log column
  const logJson = JSON.stringify(logDocument);

  const result = await database.request()
    .input('receivedAt', sql.DateTime2, receivedAt)
    .input('ip', sql.NVarChar(50), ip)
    .input('userAgent', sql.NVarChar(500), userAgent)
    .input('log', sql.NVarChar(sql.MAX), logJson)
    .query(`
      INSERT INTO ${TABLE_NAME} (receivedAt, ip, userAgent, log)
      OUTPUT INSERTED.id
      VALUES (@receivedAt, @ip, @userAgent, @log)
    `);

  return {
    insertedId: result.recordset[0].id
  };
}

function rowToDocument(row) {
  // Parse the JSON log and add the id
  const doc = JSON.parse(row.log);
  doc._id = row.id;
  return doc;
}

function buildWhereClause(filter, request) {
  const conditions = [];
  let paramIndex = 0;

  // Handle _receivedAt filters
  if (filter._receivedAt) {
    if (filter._receivedAt.$gte) {
      const paramName = `receivedAtGte${paramIndex++}`;
      request.input(paramName, sql.DateTime2, new Date(filter._receivedAt.$gte));
      conditions.push(`receivedAt >= @${paramName}`);
    }
    if (filter._receivedAt.$lte) {
      const paramName = `receivedAtLte${paramIndex++}`;
      request.input(paramName, sql.DateTime2, new Date(filter._receivedAt.$lte));
      conditions.push(`receivedAt <= @${paramName}`);
    }
    if (filter._receivedAt.$lt) {
      const paramName = `receivedAtLt${paramIndex++}`;
      request.input(paramName, sql.DateTime2, new Date(filter._receivedAt.$lt));
      conditions.push(`receivedAt < @${paramName}`);
    }
    if (filter._receivedAt.$gt) {
      const paramName = `receivedAtGt${paramIndex++}`;
      request.input(paramName, sql.DateTime2, new Date(filter._receivedAt.$gt));
      conditions.push(`receivedAt > @${paramName}`);
    }
  }

  // Handle _ip filter
  if (filter._ip) {
    const paramName = `ip${paramIndex++}`;
    request.input(paramName, sql.NVarChar(50), filter._ip);
    conditions.push(`ip = @${paramName}`);
  }

  // Handle $or for search across fields (JSON search in log column)
  if (filter.$or && Array.isArray(filter.$or)) {
    const orConditions = [];
    for (const condition of filter.$or) {
      for (const [field, value] of Object.entries(condition)) {
        if (value && value.$regex) {
          const paramName = `search${paramIndex++}`;
          // Use LIKE for pattern matching in JSON
          request.input(paramName, sql.NVarChar(sql.MAX), `%${value.$regex}%`);
          orConditions.push(`log LIKE @${paramName}`);
        }
      }
    }
    if (orConditions.length > 0) {
      // Deduplicate conditions since they all search the same log column
      conditions.push(`(${[...new Set(orConditions)].join(' OR ')})`);
    }
  }

  // Handle field-specific searches (for fields stored in JSON log column)
  // These come as filter[fieldName] = { $regex: RegExp } from the API
  const systemFields = ['_receivedAt', '_ip', '$or'];
  for (const [field, value] of Object.entries(filter)) {
    if (systemFields.includes(field)) continue;

    if (value && typeof value === 'object' && value.$regex) {
      // Extract the pattern from RegExp object or string
      let pattern;
      if (value.$regex instanceof RegExp) {
        pattern = value.$regex.source;
      } else {
        pattern = String(value.$regex);
      }

      const paramName = `field${paramIndex++}`;
      // Use JSON_VALUE to extract the field from JSON and search with LIKE (case-insensitive)
      request.input(paramName, sql.NVarChar(sql.MAX), `%${pattern}%`);
      conditions.push(`LOWER(JSON_VALUE(log, '$.${field}')) LIKE LOWER(@${paramName})`);
    }
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function findLogs(filter = {}, options = {}) {
  const database = getDb();
  const { limit = 100, skip = 0, sort = { _receivedAt: -1 } } = options;

  const request = database.request();
  const whereClause = buildWhereClause(filter, request);

  // Build ORDER BY clause
  let orderBy = 'ORDER BY receivedAt DESC';
  if (sort) {
    const sortFields = [];
    for (const [field, direction] of Object.entries(sort)) {
      const sqlField = field === '_receivedAt' ? 'receivedAt' : field === '_ip' ? 'ip' : 'receivedAt';
      sortFields.push(`${sqlField} ${direction === -1 ? 'DESC' : 'ASC'}`);
    }
    if (sortFields.length > 0) {
      orderBy = `ORDER BY ${sortFields.join(', ')}`;
    }
  }

  const query = `
    SELECT id, receivedAt, ip, userAgent, log
    FROM ${TABLE_NAME}
    ${whereClause}
    ${orderBy}
    OFFSET ${skip} ROWS
    FETCH NEXT ${limit} ROWS ONLY
  `;

  const result = await request.query(query);
  return result.recordset.map(rowToDocument);
}

export async function countLogs(filter = {}) {
  const database = getDb();
  const request = database.request();
  const whereClause = buildWhereClause(filter, request);

  const query = `SELECT COUNT(*) as count FROM ${TABLE_NAME} ${whereClause}`;
  const result = await request.query(query);
  return result.recordset[0].count;
}

export async function findLogById(id) {
  const database = getDb();

  try {
    const result = await database.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT id, receivedAt, ip, userAgent, log FROM ${TABLE_NAME} WHERE id = @id`);

    if (result.recordset.length === 0) {
      return null;
    }

    return rowToDocument(result.recordset[0]);
  } catch {
    return null;
  }
}

export async function deleteLogs(filter = {}) {
  const database = getDb();
  const request = database.request();
  const whereClause = buildWhereClause(filter, request);

  const query = `DELETE FROM ${TABLE_NAME} ${whereClause}`;
  const result = await request.query(query);
  return { deletedCount: result.rowsAffected[0] };
}

export async function getStats(dbConfig) {
  const database = getDb();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalResult, todayResult, lastLogResult, sizeResult] = await Promise.all([
    database.request().query(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`),
    database.request()
      .input('startOfDay', sql.DateTime2, startOfDay)
      .query(`SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE receivedAt >= @startOfDay`),
    database.request().query(`SELECT TOP 1 receivedAt FROM ${TABLE_NAME} ORDER BY receivedAt DESC`),
    database.request().query(`
      SELECT
        SUM(reserved_page_count) * 8 * 1024 as dataSize,
        SUM(used_page_count) * 8 * 1024 as usedSize
      FROM sys.dm_db_partition_stats
      WHERE object_id = OBJECT_ID('${TABLE_NAME}')
    `)
  ]);

  return {
    totalLogs: totalResult.recordset[0].count,
    todayLogs: todayResult.recordset[0].count,
    lastLog: lastLogResult.recordset.length > 0 ? lastLogResult.recordset[0].receivedAt : null,
    database: {
      name: dbConfig.database.mssql.database,
      type: 'mssql',
      dataSize: formatBytes(sizeResult.recordset[0]?.dataSize || 0),
      usedSize: formatBytes(sizeResult.recordset[0]?.usedSize || 0)
    }
  };
}

export async function clearLogs(dbConfig, options = {}) {
  const filter = {};
  if (options.before) {
    filter._receivedAt = { $lt: new Date(options.before) };
  }

  return await deleteLogs(filter);
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
