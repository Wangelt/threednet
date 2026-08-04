const { nodeEnv } = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (err.details) payload.details = err.details;

  if (err.name === 'ValidationError') {
    payload.message = 'Validation failed';
    payload.details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(payload);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    payload.message = `${field} already exists`;
    return res.status(409).json(payload);
  }

  if (err.name === 'CastError') {
    payload.message = 'Invalid resource id';
    return res.status(400).json(payload);
  }

  if (nodeEnv === 'development' && statusCode === 500) {
    payload.stack = err.stack;
  }

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;
