function errorHandler(err, req, res, next) {
  // Check Multer specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum permitted limit of 5 MB.',
      },
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Operation failed.';

  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
    },
  };

  if (err.details) {
    response.error.details = err.details;
  }

  // Avoid logging tokens or sensitive data in production
  if (statusCode === 500) {
    console.error(`[Error ${statusCode}]`, err.message);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
