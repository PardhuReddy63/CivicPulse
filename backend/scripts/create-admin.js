const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function createAdmin() {
  const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!name || !email || !password || password.length < 12) {
    throw new Error(
      'Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters) for this one-time bootstrap.'
    );
  }

  const existing = await db.query("SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1");
  if (existing.length) {
    throw new Error('An administrator already exists. Use the authenticated admin user-management workflow.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (name, email, password_hash, role, active, verified, created_at, updated_at)
     VALUES (?, ?, ?, 'ADMIN', 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [name.trim(), email.trim().toLowerCase(), passwordHash]
  );
  console.log('Administrator account created. Sign in with the supplied email and password.');
}

createAdmin()
  .catch((error) => {
    console.error(`Administrator bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
