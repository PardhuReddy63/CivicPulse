
const app = require('./src/app');
const config = require('./src/config/env');
const db = require('./src/config/db');
const complaintService = require('./src/services/complaintService');

async function startServer() {
  try {
    config.validateEnvironment();

    // Verify database connectivity before accepting requests.
    await db.testConnection();
    console.log('✔ Connected to PostgreSQL Database');

    // Recover older pending grievances before accepting requests.
    try {
      const recovery = await complaintService.recoverPendingAssignments();

      console.log(
        `✔ Pending assignment recovery complete: ` +
        `${recovery.assigned} assigned, ` +
        `${recovery.processed} examined`
      );
    } catch (recoveryError) {
      console.error(
        '⚠ Pending assignment recovery failed:',
        recoveryError.message
      );
    }

    const server = app.listen(config.PORT, () => {
      console.log('====================================================');
      console.log(
        `🚀 CivicPulse Hub Backend API running on port ${config.PORT}`
      );
      console.log(
        `📡 Base URL: http://localhost:${config.PORT}/api/v1`
      );
      console.log(`🌐 Frontend Allowed Origin: ${config.FRONTEND_URL}`);
      console.log('====================================================');
    });

    let shuttingDown = false;

    async function shutdown(signal) {
      if (shuttingDown) return;
      shuttingDown = true;

      console.log(`${signal} received; shutting down gracefully...`);

      server.close(async (error) => {
        if (error) {
          console.error('HTTP server shutdown failed:', error.message);
          process.exitCode = 1;
        }

        try {
          await db.end();
          console.log('✔ Database pool closed');
        } catch (dbError) {
          console.error('Database shutdown failed:', dbError.message);
          process.exitCode = 1;
        }
      });
    }

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Backend startup failed:', error.message);
    process.exitCode = 1;
  }
}

startServer();
