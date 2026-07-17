const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

const validateRules = (rules) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(rules.map(rule => rule.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    // Create validation error and pass to centralized error middleware
    const errorMsg = extractedErrors.map(e => `${e.field}: ${e.message}`).join(', ');
    const validationError = new AppError(`Validation failed: ${errorMsg}`, 400);
    validationError.validationErrors = extractedErrors;
    
    return next(validationError);
  };
};

module.exports = { validateRules };
