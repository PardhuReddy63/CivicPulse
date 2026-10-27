const db = require('../config/db');

class OtpRepository {
  async createOtp(userId, otpHash, expiresAt) {
    // Invalidate any existing unused OTPs for this user
    await db.query(
      `UPDATE otp_verifications SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL`,
      [userId]
    );

    const result = await db.query(
      `INSERT INTO otp_verifications (user_id, otp_hash, expires_at, used_at, attempt_count, created_at)
       VALUES (?, ?, ?, NULL, 0, UTC_TIMESTAMP())`,
      [userId, otpHash, expiresAt]
    );
    return result.insertId;
  }

  async findLatestValidOtp(userId) {
    const rows = await db.query(
      `SELECT * FROM otp_verifications
       WHERE user_id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async incrementAttempts(otpId) {
    await db.query(
      `UPDATE otp_verifications SET attempt_count = attempt_count + 1 WHERE otp_id = ?`,
      [otpId]
    );
  }

  async markUsed(otpId) {
    await db.query(
      `UPDATE otp_verifications SET used_at = UTC_TIMESTAMP() WHERE otp_id = ?`,
      [otpId]
    );
  }

  // Password reset tokens
  async createPasswordResetToken(userId, tokenHash, expiresAt) {
    await db.query(
      `UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL`,
      [userId]
    );
    const result = await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at)
       VALUES (?, ?, ?, NULL, UTC_TIMESTAMP())`,
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  }

  async findValidPasswordResetToken(tokenHash) {
    const rows = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  async markPasswordResetTokenUsed(resetId) {
    await db.query(
      `UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE reset_id = ?`,
      [resetId]
    );
  }
}

module.exports = new OtpRepository();
