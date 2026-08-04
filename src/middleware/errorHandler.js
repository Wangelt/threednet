const { nodeEnv } = require('../config/env');

function friendlyDuplicateMessage(err) {
  const field = Object.keys(err.keyPattern || {})[0] || 'field';
  const labels = {
    email: 'Email already registered',
    slug: 'This slug is already in use',
    code: 'Coupon code already exists',
    orderId: 'Order id conflict, please retry',
    requestId: 'Request id conflict, please retry',
  };
  return labels[field] || `${field} already exists`;
}

function mapError(err) {
  // Operational API errors
  if (err.isOperational && err.statusCode) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      details: err.details || undefined,
    };
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    return {
      statusCode: 400,
      message: 'Validation failed',
      details: Object.values(err.errors || {}).map((e) => e.message),
    };
  }

  // Duplicate key
  if (err.code === 11000) {
    return {
      statusCode: 409,
      message: friendlyDuplicateMessage(err),
    };
  }

  // Bad ObjectId / cast
  if (err.name === 'CastError') {
    return {
      statusCode: 400,
      message: 'Invalid id format',
    };
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid authentication token' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Authentication token has expired' };
  }

  // Multer
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 400, message: 'File too large (max 10MB)' };
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return { statusCode: 400, message: 'Too many files (max 5)' };
    }
    return { statusCode: 400, message: err.message || 'File upload failed' };
  }

  // Mongo / Mongoose connection & buffering
  const raw = `${err.message || ''} ${err.name || ''}`;
  if (
    err.name === 'MongooseError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    /buffering timed out/i.test(raw) ||
    /Server selection timed out/i.test(raw) ||
    /ENOTFOUND|ECONNREFUSED|querySrv/i.test(raw)
  ) {
    return {
      statusCode: 503,
      message:
        'Database is temporarily unavailable. Please try again in a moment.',
    };
  }

  // Cloudinary / Razorpay generic network
  if (/cloudinary/i.test(raw)) {
    return {
      statusCode: 502,
      message: 'Image upload service failed. Please try again.',
    };
  }
  if (/razorpay/i.test(raw)) {
    return {
      statusCode: 502,
      message: 'Payment service failed. Please try again.',
    };
  }

  // Rate limit default message objects
  if (err.status === 429) {
    return {
      statusCode: 429,
      message: err.message || 'Too many requests. Please try again later.',
    };
  }

  return {
    statusCode: err.statusCode || 500,
    message:
      nodeEnv === 'production'
        ? 'Something went wrong. Please try again later.'
        : err.message || 'Internal server error',
  };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const mapped = mapError(err);

  const payload = {
    success: false,
    message: mapped.message,
  };

  if (mapped.details) payload.details = mapped.details;

  // Never leak stacks / mongoose internals in production
  if (nodeEnv === 'development' && mapped.statusCode >= 500) {
    payload.stack = err.stack;
  }

  return res.status(mapped.statusCode).json(payload);
}

module.exports = errorHandler;
