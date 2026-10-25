const controller = require('../../src/controllers/officerRegistrationController');
const officerRegistrationRepository = require('../../src/repositories/officerRegistrationRepository');
const officerActivationService = require('../../src/services/officerActivationService');
const mailer = require('../../src/services/mailer');

describe('Officer registration controller approval email', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: { requestId: '12' },
      body: { status: 'APPROVED' },
      user: { user_id: 7 },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    jest.spyOn(officerRegistrationRepository, 'findById')
      .mockResolvedValue({
        request_id: 12,
        email: 'officer@example.test',
        status: 'PENDING',
      });

    jest.spyOn(officerRegistrationRepository, 'reviewPendingApplication')
      .mockResolvedValue({
        updated: true,
        application: {
          request_id: 12,
          email: 'officer@example.test',
          status: 'APPROVED',
        },
      });

    jest.spyOn(officerActivationService, 'createActivationLink')
      .mockResolvedValue({
        email: 'officer@example.test',
        activationUrl: 'http://localhost:5173/officer/activate?token=test-token',
      });

    jest.spyOn(mailer, 'sendOfficerApprovalEmail')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('approves an application and emails its activation link', async () => {
    await controller.reviewApplication(req, res, next);

    expect(officerRegistrationRepository.reviewPendingApplication)
      .toHaveBeenCalledWith({
        requestId: 12,
        status: 'APPROVED',
        reviewerId: 7,
        reviewNotes: null,
      });

    expect(officerActivationService.createActivationLink)
      .toHaveBeenCalledWith(12);

    expect(mailer.sendOfficerApprovalEmail).toHaveBeenCalledWith(
      'officer@example.test',
      expect.stringContaining('/officer/activate?token=')
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          email_sent: true,
          message: expect.stringContaining('emailed to the applicant'),
        }),
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  test('keeps approval when activation email delivery fails', async () => {
    mailer.sendOfficerApprovalEmail.mockRejectedValue(
      Object.assign(new Error('SMTP unavailable'), {
        code: 'SMTP_UNAVAILABLE',
      })
    );

    await controller.reviewApplication(req, res, next);

    expect(officerRegistrationRepository.reviewPendingApplication)
      .toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          email_sent: false,
          email_error: 'SMTP_UNAVAILABLE',
          message: expect.stringContaining('administrator must retry'),
        }),
      })
    );

    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a retry when the application is not approved', async () => {
    req.params.requestId = '13';

    officerRegistrationRepository.findById.mockResolvedValue({
      request_id: 13,
      email: 'pending@example.test',
      status: 'PENDING',
    });

    await controller.resendActivationEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'APPLICATION_NOT_APPROVED',
        }),
      })
    );

    expect(officerActivationService.createActivationLink)
      .not.toHaveBeenCalled();

    expect(mailer.sendOfficerApprovalEmail).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('resends a fresh activation link for an approved application', async () => {
    req.params.requestId = '12';

    officerRegistrationRepository.findById.mockResolvedValue({
      request_id: 12,
      email: 'officer@example.test',
      status: 'APPROVED',
    });

    await controller.resendActivationEmail(req, res, next);

    expect(officerActivationService.createActivationLink)
      .toHaveBeenCalledWith(12);

    expect(mailer.sendOfficerApprovalEmail).toHaveBeenCalledWith(
      'officer@example.test',
      expect.stringContaining('/officer/activate?token=')
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          email_sent: true,
        }),
      })
    );

    expect(next).not.toHaveBeenCalled();
  });
});
