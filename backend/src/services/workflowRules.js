function assertAssignable(status) {
  if (!['PENDING', 'ASSIGNED', 'RESOLUTION_REJECTED'].includes(status)) {
    const error = new Error('Only pending or assigned complaints can be assigned or reassigned.');
    error.status = 409;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
}

function assertResolvable(status) {
  if (!['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_REJECTED'].includes(status)) {
    const error = new Error('Only an assigned, in-progress, or rejected-resolution grievance can be submitted for review.');
    error.status = 409;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
}

function assertStartable(status) {
  if (!['ASSIGNED', 'RESOLUTION_REJECTED'].includes(status)) {
    const error = new Error('Only an assigned or revision-requested grievance can be started.');
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
  return rating <= 2 ? 'ASSIGNED' : 'RESOLVED';
}

module.exports = {
  assertAssignable,
  assertResolvable,
  assertStartable,
  parseRating,
  statusAfterFeedback,
};
