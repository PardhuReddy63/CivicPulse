
const path = require('path');
const dotenv = require('dotenv');

// Always load the backend's own .env file, regardless of the
// directory from which the server command is launched.
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const parsePort = (value, fallback) => {
  const port = Number(value || fallback);

  return Number.isInteger(port) && port >= 1 && port <= 65535
    ? port
    : NaN;
};

const config = {
  PORT: parsePort(process.env.PORT, 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',

  FRONTEND_URL:
    process.env.FRONTEND_URL || 'http://localhost:5173',

  DB: {
    host: process.env.DB_HOST || '',
    port: parsePort(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
  },

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  SMTP: {
    host: process.env.SMTP_HOST || '',
    port: parsePort(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM_EMAIL || '',
  },

  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || '',
  PYTHON_SERVICE_TOKEN: process.env.PYTHON_SERVICE_TOKEN || '',

  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};

config.validateEnvironment = () => {
  const errors = [];

  if (!Number.isInteger(config.PORT)) {
    errors.push('PORT must be a valid TCP port number.');
  }

  if (
    !config.DB.host ||
    !config.DB.database ||
    !config.DB.user
  ) {
    errors.push(
      'Set DB_HOST, DB_NAME, and DB_USER in backend/.env.'
    );
  }

  if (!Number.isInteger(config.DB.port)) {
    errors.push('DB_PORT must be a valid TCP port number.');
  }

  if (
    config.JWT_SECRET.length < 32 ||
    /replace|change_me|example|placeholder/i.test(
      config.JWT_SECRET
    )
  ) {
    errors.push(
      'Set JWT_SECRET to a unique random value of at least 32 characters.'
    );
  }

  const smtpFields = [
    config.SMTP.host,
    config.SMTP.user,
    config.SMTP.password,
    config.SMTP.from,
  ];

  const smtpConfigured = smtpFields.some(Boolean);
  const smtpComplete = smtpFields.every(Boolean);

  if (
    smtpConfigured &&
    !Number.isInteger(config.SMTP.port)
  ) {
    errors.push('SMTP_PORT must be a valid TCP port number.');
  }

  if (config.NODE_ENV === 'production' && !smtpComplete) {
    errors.push(
      'SMTP is required in production. Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL.'
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid backend configuration:\n- ${errors.join('\n- ')}`
    );
  }
};

module.exports = config;
