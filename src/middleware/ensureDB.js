const { connectDB, isDBReady } = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Ensures MongoDB is connected before handling the request.
 * Critical for Vercel serverless where cold starts may race requests.
 */
async function ensureDB(req, res, next) {
  try {
    if (!isDBReady()) {
      await connectDB();
    }
    return next();
  } catch (err) {
    return next(
      new ApiError(
        503,
        'Database is temporarily unavailable. Please try again in a moment.'
      )
    );
  }
}

module.exports = ensureDB;
