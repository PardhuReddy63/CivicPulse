const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const otpRepository = require('../repositories/otpRepository');
const auditRepository = require('../repositories/auditRepository');
const mailer = require('./mailer');

class AuthService {
  async register({ name, email, password, role = 'CITIZEN', department_id = null }) {
    if (role !== 'CITIZEN') {
      const err = new Error('Public registration is only available for citizens.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
    mailer.assertConfigured();
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error('An account with this email address already exists.');
      err.status = 409;
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userId = await userRepository.create({
      name,
      email,
      password_hash,
      role,
      department_id: role === 'OFFICER' ? department_id : null,
    });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await otpRepository.createOtp(userId, otpHash, expiresAt);
    await mailer.sendVerificationOtp(email, otp);

    await auditRepository.log({
      actor_user_id: userId,
      action: 'USER_REGISTERED',
      entity_type: 'USER',
      entity_id: userId,
      details_json: { email, role },
    });

    return {
      user_id: userId,
      email,
      name,
      role,
      message: 'Registration successful. Please verify the code sent to your email.',
    };
  }

  async verifyOtp({ email, otp }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (user.verified) {
      return { message: 'Account is already verified. You can log in.' };
    }

    const record = await otpRepository.findLatestValidOtp(user.user_id);
    if (!record) {
      const err = new Error('Invalid or expired OTP. Please request a new one.');
      err.status = 400;
      err.code = 'OTP_EXPIRED';
      throw err;
    }

    if (record.attempt_count >= 5) {
      const err = new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
      err.status = 429;
      err.code = 'OTP_ATTEMPTS_EXCEEDED';
      throw err;
    }

    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (inputHash !== record.otp_hash) {
      await otpRepository.incrementAttempts(record.otp_id);
      const err = new Error('Incorrect OTP code.');
      err.status = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    await otpRepository.markUsed(record.otp_id);
    await userRepository.markVerified(user.user_id);

    await auditRepository.log({
      actor_user_id: user.user_id,
      action: 'EMAIL_VERIFIED',
      entity_type: 'USER',
      entity_id: user.user_id,
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendOtp({ email }) {
    mailer.assertConfigured();
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Avoid revealing whether account exists
      return { message: 'If an account with this email exists, a new OTP has been dispatched.' };
    }

    if (user.verified) {
      return { message: 'Account is already verified.' };
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await otpRepository.createOtp(user.user_id, otpHash, expiresAt);
    await mailer.sendVerificationOtp(email, otp);

    return { message: 'A new verification code has been sent to your email.' };
  }

  async login({ identifier, email, password }) {
    const user = await userRepository.findByIdentifier(identifier || email);
    if (!user) {
      const err = new Error('Invalid username/email or password.');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid username/email or password.');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    if (!user.active) {
      const err = new Error('Account has been deactivated. Please contact support.');
      err.status = 403;
      err.code = 'ACCOUNT_DEACTIVATED';
      throw err;
    }

    if (!user.verified) {
      const err = new Error('Email not verified. Please complete OTP verification first.');
      err.status = 401;
      err.code = 'ACCOUNT_UNVERIFIED';
      throw err;
    }

    const payload = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      department_id: user.department_id,
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    await auditRepository.log({
      actor_user_id: user.user_id,
      action: 'USER_LOGIN',
      entity_type: 'AUTH',
      entity_id: user.user_id,
    });

    return {
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
      },
    };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('Authenticated account was not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      const err = new Error('Current password is incorrect.');
      err.status = 400;
      err.code = 'CURRENT_PASSWORD_INCORRECT';
      throw err;
    }
    if (await bcrypt.compare(newPassword, user.password_hash)) {
      const err = new Error('Choose a password different from your current password.');
      err.status = 400;
      err.code = 'PASSWORD_UNCHANGED';
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await userRepository.updatePassword(user.user_id, passwordHash);
    await auditRepository.log({
      actor_user_id: user.user_id,
      action: 'PASSWORD_CHANGED',
      entity_type: 'AUTH',
      entity_id: user.user_id,
    });
    return { message: 'Password updated successfully.' };
  }

  async forgotPassword({ email }) {
    mailer.assertConfigured();
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return { message: 'If this email exists in our records, a password reset link has been dispatched.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await otpRepository.createPasswordResetToken(user.user_id, tokenHash, expiresAt);
    await mailer.sendPasswordResetToken(email, rawToken);

    return { message: 'If this email exists in our records, a password reset message has been sent.' };
  }

  async resetPassword({ token, password }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await otpRepository.findValidPasswordResetToken(tokenHash);

    if (!record) {
      const err = new Error('Invalid or expired password reset token.');
      err.status = 400;
      err.code = 'INVALID_RESET_TOKEN';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, salt);

    await userRepository.updatePassword(record.user_id, newHash);
    await otpRepository.markPasswordResetTokenUsed(record.reset_id);

    await auditRepository.log({
      actor_user_id: record.user_id,
      action: 'PASSWORD_RESET',
      entity_type: 'USER',
      entity_id: record.user_id,
    });

    return { message: 'Password has been successfully updated. You may now log in.' };
  }
}

module.exports = new AuthService();
