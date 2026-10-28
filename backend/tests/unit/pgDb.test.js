
const { Pool } = require('pg');



jest.mock('pg', () => ({

  Pool: jest.fn(),

}));



describe('PostgreSQL adapter', () => {

  let db;

  let mockClient;

  let mockPool;



  beforeEach(() => {

    jest.resetModules();



    mockClient = {

      query: jest.fn(),

      release: jest.fn(),

    };



    mockPool = {

      query: jest.fn(),

      connect: jest.fn().mockResolvedValue(mockClient),

      end: jest.fn(),

    };



    jest.doMock('pg', () => ({

      Pool: jest.fn(() => mockPool),

    }));



    jest.doMock('../../src/config/env', () => ({

      DB: {

        host: 'localhost',

        port: 5432,

        database: 'test_db',

        user: 'test_user',

        password: 'test_password',

        ssl: false,

      },

    }));



    db = require('../../src/config/pgDb');

  });



  afterEach(() => {

    jest.clearAllMocks();

  });



  test('converts question-mark placeholders to PostgreSQL placeholders', async () => {

    mockPool.query.mockResolvedValue({

      command: 'SELECT',

      rows: [{ id: 1 }],

      rowCount: 1,

    });



    const rows = await db.query(

      'SELECT * FROM users WHERE email = ? AND active = ?',

      ['test@example.com', true],

    );



    expect(mockPool.query).toHaveBeenCalledWith(

      'SELECT * FROM users WHERE email = $1 AND active = $2',

      ['test@example.com', true],

    );

    expect(rows).toEqual([{ id: 1 }]);

  });



  test('preserves question marks inside quoted strings and comments', async () => {

    mockPool.query.mockResolvedValue({

      command: 'SELECT',

      rows: [],

      rowCount: 0,

    });



    await db.query("SELECT '?' AS symbol, email FROM users -- ignore ?\nWHERE id = ?", [7]);



    expect(mockPool.query.mock.calls[0][0]).toBe(

      "SELECT '?' AS symbol, email FROM users -- ignore ?\nWHERE id = $1",

    );

  });



  test('returns rows for SELECT queries', async () => {

    const rows = [{ id: 4, email: 'test@example.com' }];



    mockPool.query.mockResolvedValue({

      command: 'SELECT',

      rows,

      rowCount: 1,

    });



    await expect(db.query('SELECT * FROM users')).resolves.toEqual(rows);
  });

  test('returns insertId from PostgreSQL INSERT ... RETURNING results', async () => {
    mockPool.query.mockResolvedValue({
      command: 'INSERT',
      rows: [{ user_id: 42 }],
      rowCount: 1,
    });

    const result = await db.query(
      'INSERT INTO users (name) VALUES (?) RETURNING user_id',
      ['Test User'],
    );

    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO users (name) VALUES ($1) RETURNING user_id',
      ['Test User'],
    );

    expect(result.insertId).toBe(42);
    expect(result.affectedRows).toBe(1);
  });


  test('returns affectedRows for UPDATE queries', async () => {

    mockPool.query.mockResolvedValue({

      command: 'UPDATE',

      rows: [],

      rowCount: 2,

    });



    await expect(db.query('UPDATE users SET active = $1', [false])).resolves.toMatchObject({

      affectedRows: 2,

      rowCount: 2,

    });

  });



  test('runs transactions and releases the client', async () => {

    mockClient.query.mockResolvedValue({ command: 'BEGIN', rows: [], rowCount: null });



    const result = await db.withTransaction(async (transaction) => {

      expect(typeof transaction.query).toBe('function');

      return 'transaction-ok';

    });



    expect(result).toBe('transaction-ok');

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');

    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

    expect(mockClient.release).toHaveBeenCalledTimes(1);

  });



  test('rolls back failed transactions and releases the client', async () => {

    mockClient.query.mockImplementation(async (sql) => {

      if (sql === 'BEGIN') return { command: 'BEGIN', rows: [], rowCount: null };

      if (sql === 'ROLLBACK') return { command: 'ROLLBACK', rows: [], rowCount: null };

      throw new Error('simulated query failure');

    });



    await expect(

      db.withTransaction(async (transaction) => {

        await transaction.query('SELECT * FROM users WHERE id = ?', [1]);

      }),

    ).rejects.toThrow('simulated query failure');



    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');

    expect(mockClient.release).toHaveBeenCalledTimes(1);

  });

});
