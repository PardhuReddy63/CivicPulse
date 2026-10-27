
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const db = require('../config/db');
const officerActivationRepository = require('../repositories/officerActivationRepository');
const auditRepository = require('../repositories/auditRepository');

function activationError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

class OfficerActivationService {
  async createActivationLink(requestId) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const application = await db.withTransaction(async (client) => {
      const rows = await client.query(
        `SELECT request_id, full_name, email, department_id, status
         FROM officer_registration_requests
         WHERE request_id = ?
         FOR UPDATE`,
        [requestId]
      );

      const record = rows[0];

      if (!record || record.status !== 'APPROVED') {
        throw activationError(
          'Only approved officer applications can be activated.',
          409,
          'APPLICATION_NOT_APPROVED'
        );
      }

      const existingUsers = await client.query(
        `SELECT user_id
         FROM users
         WHERE LOWER(email) = LOWER(?)
         LIMIT 1`,
        [record.email]
      );

      if (existingUsers.length > 0) {
        throw activationError(
          'An account already exists for this email address.',
          409,
          'ACCOUNT_ALREADY_EXISTS'
        );
      }

      await officerActivationRepository.invalidateUnusedTokens(
        requestId,
        client
      );

      await officerActivationRepository.createToken(
        requestId,
        tokenHash,
        expiresAt,
        client
      );

      return record;
    });

    const activationUrl =
      `${config.FRONTEND_URL.replace(/\/$/, '')}/officer/activate?token=${rawToken}`;

    return {
      email: application.email,
      activationUrl,
    };
  }

  async activateAccount({ token, password }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return db.withTransaction(async (client) => {
      // Lock the token row and revalidate it inside the transaction.
      const tokens = await client.query(
        `SELECT activation_id, request_id
         FROM officer_activation_tokens
         WHERE token_hash = ?
           AND used_at IS NULL
           AND expires_at > UTC_TIMESTAMP()
         LIMIT 1
         FOR UPDATE`,
        [tokenHash]
      );

      const activation = tokens[0];

      if (!activation) {
        throw activationError(
          'This activation link is invalid, expired, or already used.',
          400,
          'INVALID_ACTIVATION_TOKEN'
        );
      }

      const requests = await client.query(
        `SELECT request_id, full_name, email, department_id, status
         FROM officer_registration_requests
         WHERE request_id = ?
         FOR UPDATE`,
        [activation.request_id]
      );

      const application = requests[0];

      if (!application || application.status !== 'APPROVED') {
        throw activationError(
          'This officer application is not approved.',
          409,
          'APPLICATION_NOT_APPROVED'
        );
      }

      const users = await client.query(
        `SELECT user_id
         FROM users
         WHERE LOWER(email) = LOWER(?)
         LIMIT 1
         FOR UPDATE`,
        [application.email]
      );

      if (users.length > 0) {
        throw activationError(
          'An account already exists for this email address.',
          409,
          'ACCOUNT_ALREADY_EXISTS'
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const created = await client.query(
        `INSERT INTO users
           (name, email, password_hash, role, department_id, active, verified,
            created_at, updated_at)
         VALUES (?, ?, ?, 'OFFICER', ?, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          application.full_name,
          application.email,
          passwordHash,
          application.department_id,
        ]
      );

      const consumed = await officerActivationRepository.markUsed(
        activation.activation_id,
        client
      );

      if (!consumed) {
        throw activationError(
          'This activation link is invalid, expired, or already used.',
          400,
          'INVALID_ACTIVATION_TOKEN'
        );
      }

      await auditRepository.log({
        actor_user_id: created.insertId,
        action: 'OFFICER_ACCOUNT_ACTIVATED',
        entity_type: 'USER',
        entity_id: created.insertId,
        details_json: {
          request_id: application.request_id,
          department_id: application.department_id,
        },
        client,
      });

      return {
        message: 'Officer account activated successfully. You can now log in.',
      };
    });
  }
}

module.exports = new OfficerActivationService();
