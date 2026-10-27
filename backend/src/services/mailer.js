const nodemailer = require('nodemailer');
const config = require('../config/env');

function createConfigurationError() {
  const error = new Error(
    'Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL in backend/.env.'
  );
  error.status = 503;
  error.code = 'SMTP_NOT_CONFIGURED';
  return error;
}

function getTransport() {
  const { host, port, user, password } = config.SMTP;
  if (!host || !user || !password || !config.SMTP.from) {
    throw createConfigurationError();
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: config.SMTP.secure,
    auth: {
      user,
      pass: password,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

function assertConfigured() {
  if (!config.SMTP.host || !config.SMTP.user || !config.SMTP.password || !config.SMTP.from) {
    throw createConfigurationError();
  }
}

async function sendVerificationOtp(email, otp) {
  const transport = getTransport();
  await transport.sendMail({
    from: config.SMTP.from,
    to: email,
    subject: 'CivicPulse Hub email verification',
    text: `Your CivicPulse Hub verification code is ${otp}. It expires in 15 minutes.`,
  });
}

async function sendPasswordResetToken(email, token) {
  const transport = getTransport();
  await transport.sendMail({
    from: config.SMTP.from,
    to: email,
    subject: 'CivicPulse Hub password reset',
    text: `Use this password reset token in CivicPulse Hub: ${token}. It expires in 1 hour.`,
  });
}

async function sendOfficerApprovalEmail(email, activationUrl) {
  const transport = getTransport();

  await transport.sendMail({
    from: config.SMTP.from,
    to: email,
    subject: 'Your CivicPulse Hub officer application was approved',
    text: [
      'Congratulations!',
      '',
      'Your CivicPulse Hub officer registration application has been approved.',
      '',
      'To activate your account and set your password, open this secure link:',
      activationUrl,
      '',
      'This link expires in 30 minutes and can only be used once.',
      'If you did not submit this application, please ignore this email.',
    ].join('\n'),
  });
}

module.exports = {
  assertConfigured,
  sendVerificationOtp,
  sendPasswordResetToken,
  sendOfficerApprovalEmail,
};
