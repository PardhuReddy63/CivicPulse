require('dotenv').config();

const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DB: {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
  },
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SMTP: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
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
  if (!config.DB.host || !config.DB.database || !config.DB.user) {
    errors.push('Set DB_HOST, DB_NAME, and DB_USER in backend/.env.');
  }
  if (!Number.isInteger(config.DB.port) || config.DB.port < 1 || config.DB.port > 65535) {
    errors.push('DB_PORT must be a valid TCP port number.');
  }
  if (
    config.JWT_SECRET.length < 32 ||
    /replace|change_me|example|placeholder/i.test(config.JWT_SECRET)
  ) {
    errors.push('Set JWT_SECRET to a unique random value of at least 32 characters.');
  }

  const smtpValues = Object.values(config.SMTP);
  const smtpPartiallyConfigured = smtpValues.some((value) => value !== '' && value !== 587 && value !== false);
  if (!Number.isInteger(config.SMTP.port) || config.SMTP.port < 1 || config.SMTP.port > 65535) {
    errors.push('SMTP_PORT must be a valid TCP port number.');
  }
  if (
    smtpPartiallyConfigured &&
    (!config.SMTP.host || !config.SMTP.user || !config.SMTP.password || !config.SMTP.from)
  ) {
    errors.push('SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL together.');
  }

  if (errors.length) {
    throw new Error(`Invalid backend configuration:\n- ${errors.join('\n- ')}`);
  }
};

module.exports = config;
