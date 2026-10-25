
const mysql = require('mysql2/promise');
const config = require('./env');

const dbConfig = config.DB;

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * mysql2/promise returns [result, fields].
 * This adapter returns only the result expected by our repositories.
 */
function wrapConnection(connection) {
  return {
    query: async (...args) => {
      const [result] = await connection.query(...args);
      return result;
    },

    execute: async (...args) => {
      const [result] = await connection.execute(...args);
      return result;
    },

    beginTransaction: (...args) =>
      connection.beginTransaction(...args),

    commit: (...args) =>
      connection.commit(...args),

    rollback: (...args) =>
      connection.rollback(...args),

    release: () =>
      connection.release(),
  };
}

async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  const wrappedConnection = wrapConnection(connection);

  try {
    await wrappedConnection.beginTransaction();

    const result = await callback(wrappedConnection);

    await wrappedConnection.commit();
    return result;
  } catch (error) {
    try {
      await wrappedConnection.rollback();
    } catch (rollbackError) {
      console.error(
        'Transaction rollback failed:',
        rollbackError.message
      );
    }

    throw error;
  } finally {
    wrappedConnection.release();
  }
}

const db = {
  query: async (...args) => {
    const [result] = await pool.query(...args);
    return result;
  },

  execute: async (...args) => {
    const [result] = await pool.execute(...args);
    return result;
  },

  getConnection: async () => {
    const connection = await pool.getConnection();
    return wrapConnection(connection);
  },

  end: (...args) => pool.end(...args),

  testConnection,
  withTransaction,
};

module.exports = db;
