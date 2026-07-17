class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong on the server.';

  // Log error with full stack trace server-side
  console.error(`[API Error] ${req.method} ${req.originalUrl}`);
  console.error(`Status Code: ${statusCode}`);
  console.error(err.stack || err);

  const responseBody = {
    error: {
      message,
      statusCode
    }
  };

  if (err.validationErrors) {
    responseBody.error.validationErrors = err.validationErrors;
  }

  res.status(statusCode).json(responseBody);
};

// Global unhandled promise rejection handler (logs and doesn't crash the server)
process.on('unhandledRejection', (reason) => {
  console.error('CRITICAL UNHANDLED REJECTION:');
  console.error(reason);
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:');
  console.error(err);
});

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
