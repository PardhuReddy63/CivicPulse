
const db = require('../config/db');

class OfficerActivationRepository {
  async invalidateUnusedTokens(requestId, client = db) {
    await client.query(
      `UPDATE officer_activation_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE request_id = ?
         AND used_at IS NULL`,
      [requestId]
    );
  }

  async createToken(requestId, tokenHash, expiresAt, client = db) {
    const result = await client.query(
      `INSERT INTO officer_activation_tokens
         (request_id, token_hash, expires_at, used_at, created_at)
       VALUES (?, ?, ?, NULL, UTC_TIMESTAMP())`,
      [requestId, tokenHash, expiresAt]
    );

    return result.insertId;
  }

  async findValidToken(tokenHash, client = db) {
    const rows = await client.query(
      `SELECT activation_id, request_id, token_hash, expires_at
       FROM officer_activation_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      [tokenHash]
    );

    return rows[0] || null;
  }

  async markUsed(activationId, client = db) {
    const result = await client.query(
      `UPDATE officer_activation_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE activation_id = ?
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()`,
      [activationId]
    );

    return result.affectedRows === 1;
  }
}

module.exports = new OfficerActivationRepository();
