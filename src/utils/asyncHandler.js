/**
 * Wraps async route handlers so rejections go to Express error middleware.
 * (Express 5 often does this natively; keep for consistent Express 4/5 behavior.)
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
