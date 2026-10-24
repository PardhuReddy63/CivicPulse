const app = require('./src/app');
const config = require('./src/config/env');
const db = require('./src/config/db');

async function startServer() {
  try {
    config.validateEnvironment();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  try {
    // Verify database connectivity
    const [row] = await db.query('SELECT 1 as test');
    if (row && row.test === 1) {
      console.log('✔ Connected to MySQL Database (civicpulse_db)');
    }
  } catch (err) {
    console.warn('⚠ Database connection notice:', err.message);
    console.warn('  Ensure MySQL is running in XAMPP on port 3306 and schema.sql has been executed.');
  }

  const server = app.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 CivicPulse Hub Backend API running on port ${config.PORT}`);
    console.log(`📡 Base URL: http://localhost:${config.PORT}/api/v1`);
    console.log(`🌐 Frontend Allowed Origin: ${config.FRONTEND_URL}`);
    console.log(`====================================================`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      db.pool.end();
    });
  });
}

startServer();
