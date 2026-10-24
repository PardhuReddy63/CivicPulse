function assertAssignable(status) {
  if (status !== 'PENDING' && status !== 'ASSIGNED') {
    const error = new Error('Only pending or assigned complaints can be assigned or reassigned.');
    error.status = 409;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
}

function assertResolvable(status) {
  if (status !== 'ASSIGNED') {
    const error = new Error('Only an assigned complaint can be resolved.');
    error.status = 409;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
}

function parseRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error('Rating must be an integer between 1 and 5.');
    error.status = 400;
    error.code = 'INVALID_RATING';
    throw error;
  }
  return rating;
}

function statusAfterFeedback(rating) {
  return rating <= 2 ? 'PENDING' : 'RESOLVED';
}

module.exports = { assertAssignable, assertResolvable, parseRating, statusAfterFeedback };
