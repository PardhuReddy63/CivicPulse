
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');
const db = require('../src/config/db');

async function createAdmin() {
  if (
    process.env.NODE_ENV !== 'development' ||
    config.NODE_ENV !== 'development'
  ) {
    throw new Error(
      'Administrator bootstrap is available only when NODE_ENV=development.'
    );
  }

  if (!config.DB.host || !config.DB.database || !config.DB.user) {
    throw new Error(
      'Set DB_HOST, DB_NAME, and DB_USER before running the local administrator bootstrap.'
    );
  }

  if (
    !['localhost', '127.0.0.1', '::1'].includes(
      config.DB.host.toLowerCase()
    )
  ) {
    throw new Error(
      'Administrator bootstrap requires a loopback MySQL host.'
    );
  }

  const existing = await db.query(
  "SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1"
);

if (existing.length > 0) {
    console.log(
      'An administrator already exists; no account was changed.'
    );
    return;
  }

  const bootstrapIdentifier = process.env.ADMIN_BOOTSTRAP_IDENTIFIER;
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  delete process.env.ADMIN_BOOTSTRAP_IDENTIFIER;
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;

  const email = bootstrapIdentifier?.trim();

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      'Provide ADMIN_BOOTSTRAP_IDENTIFIER as a valid email address for this local run.'
    );
  }

  if (
    !bootstrapPassword ||
    bootstrapPassword.length < 8 ||
    bootstrapPassword.length > 128
  ) {
    throw new Error(
      'ADMIN_BOOTSTRAP_PASSWORD must be between 8 and 128 characters.'
    );
  }

  const emailCollision = await db.query(
  'SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
  [email]
);

if (emailCollision.length > 0) {
    throw new Error(
      'The administrator email is already used by an existing account.'
    );
  }

  const passwordHash = await bcrypt.hash(bootstrapPassword, 12);

  await db.query(
    `INSERT INTO users
       (name, email, password_hash, role, active, verified, created_at, updated_at)
     VALUES (?, ?, ?, 'ADMIN', 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    ['Administrator', email, passwordHash]
  );

  console.log(
    'Local development administrator created. Credentials were not printed.'
  );
}

createAdmin()
  .catch((error) => {
    console.error(`Administrator bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.end();
    } catch (error) {
      console.error(
        'Database pool shutdown failed:',
        error.message
      );
      process.exitCode = 1;
    }
  });
