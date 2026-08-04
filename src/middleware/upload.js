const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed')
    );
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB — matches PRD custom-order limit
    files: 5,
  },
});

/** Single file field: `file` */
const uploadSingle = upload.single('file');

/** Multiple files field: `files` (max 5) */
const uploadMultiple = upload.array('files', 5);

function runMulter(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File too large (max 10MB)'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError(400, 'Too many files (max 5)'));
        }
        return next(new ApiError(400, err.message));
      }

      return next(err);
    });
  };
}

module.exports = {
  uploadSingle: runMulter(uploadSingle),
  uploadMultiple: runMulter(uploadMultiple),
};
