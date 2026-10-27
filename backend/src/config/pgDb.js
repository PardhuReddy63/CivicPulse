
const { Pool } = require('pg');

const config = require('./env');



const dbConfig = config.DB;



const pool = new Pool({

  host: dbConfig.host,

  port: dbConfig.port,

  database: dbConfig.database,

  user: dbConfig.user,

  password: dbConfig.password,

  ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,

});


function convertSql(sql) {

  let output = '';

  let index = 0;

  let state = 'normal';



  for (let i = 0; i < sql.length; i++) {

    const char = sql[i];

    const next = sql[i + 1];



    if (state === 'normal') {

      if (char === "'") state = 'single';

      else if (char === '"') state = 'double';

      else if (char === '-' && next === '-') state = 'lineComment';

      else if (char === '/' && next === '*') state = 'blockComment';



      if (char === '?' ) {

        output += `$${++index}`;

      } else {

        output += char;

      }

      continue;

    }



    output += char;



    if ((state === 'single' && char === "'" && next === "'") ||

        (state === 'double' && char === '"' && next === '"')) {

      output += sql[++i];

    } else if ((state === 'single' && char === "'") ||

               (state === 'double' && char === '"')) {

      state = 'normal';

    } else if (state === 'lineComment' && char === '\n') {

      state = 'normal';

    } else if (state === 'blockComment' && char === '*' && next === '/') {

      output += sql[++i];

      state = 'normal';

    }

  }



  return output;

}



function convertResult(result) {

  if (result.command === 'SELECT') return result.rows;



  return {

    rows: result.rows,

    rowCount: result.rowCount,

    affectedRows: result.rowCount,

    insertId: result.command === 'INSERT' && result.rows?.[0]

      ? Object.values(result.rows[0])[0]

      : undefined,

  };

}


function wrapClient(client) {

  return {

    query: async (sql, params = []) => {

      const result = await client.query(convertSql(sql), params);

      return convertResult(result);

    },

    execute: async (sql, params = []) => {

      const result = await client.query(convertSql(sql), params);

      return convertResult(result);

    },

    beginTransaction: () => client.query('BEGIN'),

    commit: () => client.query('COMMIT'),

    rollback: () => client.query('ROLLBACK'),

    release: () => client.release(),

  };

}



async function testConnection() {

  const client = await pool.connect();

  try {

    await client.query('SELECT 1');

    return true;

  } catch (error) {

    console.error('Database connection failed:', error.message);

    throw error;

  } finally {

    client.release();

  }

}



async function withTransaction(callback) {

  const client = await pool.connect();

  const wrapped = wrapClient(client);



  try {

    await wrapped.beginTransaction();

    const result = await callback(wrapped);

    await wrapped.commit();

    return result;

  } catch (error) {

    try {

      await wrapped.rollback();

    } catch (rollbackError) {

      console.error('Transaction rollback failed:', rollbackError.message);

    }

    throw error;

  } finally {

    wrapped.release();

  }

}



module.exports = {

  query: async (sql, params = []) => {

    const result = await pool.query(convertSql(sql), params);

    return convertResult(result);

  },

  execute: async (sql, params = []) => {

    const result = await pool.query(convertSql(sql), params);

    return convertResult(result);

  },

  getConnection: async () => wrapClient(await pool.connect()),

  end: () => pool.end(),

  testConnection,

  withTransaction,

};
