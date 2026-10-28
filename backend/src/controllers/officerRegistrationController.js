
const db = require('../config/db');
const officerRegistrationRepository = require('../repositories/officerRegistrationRepository');
const officerActivationService = require('../services/officerActivationService');
const mailer = require('../services/mailer');

class OfficerRegistrationController {
  // Public endpoint: return active departments for the registration form.
  async listDepartments(req, res, next) {
    try {
      const departments = await db.query(
        `SELECT department_id, name
         FROM departments
         WHERE active = TRUE
         ORDER BY name ASC`
      );

      return res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Public endpoint: submit an officer registration application.
  async submitApplication(req, res, next) {
    try {
      const fullName = req.body.full_name.trim();
      const email = req.body.email.trim().toLowerCase();
      const phone = req.body.phone.trim();
      const designation = req.body.designation.trim();
      const reason = req.body.reason.trim();
      const departmentId = Number(req.body.department_id);

      const departments = await db.query(
        `SELECT department_id
         FROM departments
         WHERE department_id = ? AND active = TRUE
         LIMIT 1`,
        [departmentId]
      );

      if (departments.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DEPARTMENT',
            message: 'Select an active department.',
          },
        });
      }

      const existingUser =
        await officerRegistrationRepository.findExistingUserByEmail(email);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'This email cannot be used for an officer application.',
          },
        });
      }

      const existingApplication =
        await officerRegistrationRepository.findByEmail(email);

      if (existingApplication) {
        const isPending = existingApplication.status === 'PENDING';

        return res.status(409).json({
          success: false,
          error: {
            code: isPending
              ? 'APPLICATION_ALREADY_PENDING'
              : 'APPLICATION_ALREADY_EXISTS',
            message: isPending
              ? 'An application with this email is already awaiting review.'
              : 'An application with this email already exists.',
          },
        });
      }

      const requestId = await officerRegistrationRepository.create({
        full_name: fullName,
        email,
        phone,
        department_id: departmentId,
        designation,
        reason,
      });

      return res.status(201).json({
        success: true,
        data: {
          request_id: requestId,
          status: 'PENDING',
          message:
            'Your officer registration application has been submitted for administrator review.',
        },
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'APPLICATION_ALREADY_EXISTS',
            message: 'An application with this email already exists.',
          },
        });
      }

      return next(err);
    }
  }

  // Admin endpoint: list applications with pagination and optional status.
  async listApplications(req, res, next) {
    try {
      const { status } = req.query;

      if (
        status &&
        !['PENDING', 'APPROVED', 'REJECTED'].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_APPLICATION_STATUS',
            message: 'Status must be PENDING, APPROVED, or REJECTED.',
          },
        });
      }

      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Page must be positive and limit must be between 1 and 100.',
          },
        });
      }

      const result =
        await officerRegistrationRepository.listApplications({
          status: status || null,
          page,
          limit,
        });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Admin endpoint: approve or reject a pending application.
  async reviewApplication(req, res, next) {
    try {
      const requestId = Number(req.params.requestId);
      const { status, review_notes } = req.body;

      if (!Number.isSafeInteger(requestId) || requestId < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST_ID',
            message: 'A valid application ID is required.',
          },
        });
      }

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REVIEW_DECISION',
            message: 'Decision must be APPROVED or REJECTED.',
          },
        });
      }

      if (
        review_notes !== undefined &&
        review_notes !== null &&
        (typeof review_notes !== 'string' || review_notes.length > 5000)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REVIEW_NOTES',
            message: 'Review notes must be text of at most 5000 characters.',
          },
        });
      }

      const existing =
        await officerRegistrationRepository.findById(requestId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Officer registration application was not found.',
          },
        });
      }

      if (existing.status !== 'PENDING') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'APPLICATION_ALREADY_REVIEWED',
            message: 'This application has already been reviewed.',
          },
        });
      }

      const reviewerId = req.user?.user_id;

      if (!reviewerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'A valid administrator session is required.',
          },
        });
      }

      const result =
        await officerRegistrationRepository.reviewPendingApplication({
          requestId,
          status,
          reviewerId,
          reviewNotes:
            typeof review_notes === 'string' && review_notes.trim()
              ? review_notes.trim()
              : null,
        });

      if (!result.updated) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'APPLICATION_ALREADY_REVIEWED',
            message: 'This application was reviewed by another request.',
          },
        });
      }

      let emailSent = false;
      let emailError = null;

      if (status === 'APPROVED') {
        try {
          const activation = await officerActivationService.createActivationLink(
            requestId
          );

          await mailer.sendOfficerApprovalEmail(
            activation.email,
            activation.activationUrl
          );

          emailSent = true;
        } catch (err) {
          // Approval is already committed. Do not undo it if email delivery fails.
          emailError = err.code || 'EMAIL_DELIVERY_FAILED';
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          application: result.application,
          email_sent: emailSent,
          message: status === 'APPROVED'
            ? emailSent
              ? 'Application approved. An account activation link has been emailed to the applicant.'
              : 'Application approved, but the activation email could not be sent. An administrator must retry email delivery.'
            : 'Application rejected.',
          ...(status === 'APPROVED' && !emailSent
            ? { email_error: emailError }
            : {}),
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  // Admin endpoint: resend an activation email for an approved application.
  async resendActivationEmail(req, res, next) {
    try {
      const requestId = Number(req.params.requestId);

      if (!Number.isSafeInteger(requestId) || requestId < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST_ID',
            message: 'A valid application ID is required.',
          },
        });
      }

      const existing =
        await officerRegistrationRepository.findById(requestId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Officer registration application was not found.',
          },
        });
      }

      if (existing.status !== 'APPROVED') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_APPROVED',
            message: 'Only approved applications can receive activation emails.',
          },
        });
      }

      const activation =
        await officerActivationService.createActivationLink(requestId);

      await mailer.sendOfficerApprovalEmail(
        activation.email,
        activation.activationUrl
      );

      return res.status(200).json({
        success: true,
        data: {
          email_sent: true,
          message: 'A new activation link has been emailed to the applicant.',
        },
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new OfficerRegistrationController();
