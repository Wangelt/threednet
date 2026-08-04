const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

function getTokenFromRequest(req) {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  const user = await User.findById(payload.sub).populate(
    'location',
    'name code city isActive'
  );
  if (!user || user.isBlocked) {
    throw new ApiError(401, 'User not found or blocked');
  }

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).populate(
      'location',
      'name code city isActive'
    );
    if (user && !user.isBlocked) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    return next();
  };
}

module.exports = { authenticate, optionalAuth, authorize };
