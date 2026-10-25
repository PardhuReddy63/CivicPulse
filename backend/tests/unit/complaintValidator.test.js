const {
  reviewResolutionValidation,
  verifyResolutionValidation,
} = require('../../src/validators/complaintValidator');

async function validate(middleware, req) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextError;

  for (const validator of middleware) {
    if (typeof validator.run === 'function') {
      await validator.run(req);
    } else {
      validator(req, response, (error) => {
        nextError = error;
      });
    }
  }

  return { response, nextError };
}

describe('resolution workflow request validation', () => {
  test('allows approval without a rejection reason and requires a reason for rejection', async () => {
    const approval = await validate(reviewResolutionValidation, {
      params: { complaintId: '5' },
      body: { decision: 'APPROVE' },
    });
    expect(approval.response.statusCode).toBe(200);
    expect(approval.nextError).toBeUndefined();

    const rejection = await validate(reviewResolutionValidation, {
      params: { complaintId: '5' },
      body: { decision: 'REJECT', rejection_reason: '   ' },
    });
    expect(rejection.response.statusCode).toBe(400);
    expect(rejection.response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'rejection_reason' }),
    ]));
  });

  test('accepts only the supported citizen verification decisions', async () => {
    const accepted = await validate(verifyResolutionValidation, {
      params: { complaintId: '5' },
      body: { decision: 'NOT_RESOLVED', feedback_text: 'Still leaking.' },
    });
    expect(accepted.response.statusCode).toBe(200);

    const rejected = await validate(verifyResolutionValidation, {
      params: { complaintId: '5' },
      body: { decision: 'PENDING' },
    });
    expect(rejected.response.statusCode).toBe(400);
    expect(rejected.response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'decision' }),
    ]));
  });
});
