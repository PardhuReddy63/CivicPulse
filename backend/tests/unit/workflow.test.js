const {
  assertAssignable,
  assertResolvable,
  assertStartable,
  parseRating,
  statusAfterFeedback,
} = require('../../src/services/workflowRules');

function captureError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error('Expected callback to throw.');
}

describe('Backend complaint lifecycle rules', () => {
  test.each(['PENDING', 'ASSIGNED'])('%s complaints may be assigned', (status) => {
    expect(() => assertAssignable(status)).not.toThrow();
  });

  test('resolved complaints cannot be assigned again', () => {
    expect(captureError(() => assertAssignable('RESOLVED'))).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      status: 409,
    });
  });

  test('only assigned complaints can be resolved', () => {
    expect(() => assertResolvable('ASSIGNED')).not.toThrow();
    expect(() => assertResolvable('IN_PROGRESS')).not.toThrow();
    expect(captureError(() => assertResolvable('PENDING'))).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      status: 409,
    });
  });

  test.each(['ASSIGNED', 'RESOLUTION_REJECTED'])(
    '%s complaints can be started by the assigned officer',
    (status) => {
      expect(() => assertStartable(status)).not.toThrow();
    }
  );

  test('complaints outside assigned or revision-requested states cannot be started', () => {
    expect(captureError(() => assertStartable('IN_PROGRESS'))).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      status: 409,
    });
    expect(captureError(() => assertStartable('RESOLVED'))).toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      status: 409,
    });
  });

  test.each([[1, 'ASSIGNED'], [2, 'ASSIGNED'], [3, 'RESOLVED'], [4, 'RESOLVED'], [5, 'RESOLVED']])(
    'rating %i leaves the complaint in %s',
    (rating, expectedStatus) => {
      expect(statusAfterFeedback(rating)).toBe(expectedStatus);
    }
  );

  test('ratings must be integers from 1 through 5', () => {
    expect(parseRating('5')).toBe(5);
    for (const value of [0, 6, 2.5, '3abc']) {
      expect(captureError(() => parseRating(value))).toMatchObject({
        code: 'INVALID_RATING',
        status: 400,
      });
    }
  });
});
