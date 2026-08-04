const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  uploadBuffer,
  uploadMany,
  destroyAsset,
  isCloudinaryConfigured,
} = require('../services/cloudinaryService');

const FOLDERS = {
  products: '3dforge/products',
  categories: '3dforge/categories',
  'custom-orders': '3dforge/custom-orders',
  reviews: '3dforge/reviews',
  general: '3dforge/general',
};

function resolveFolder(key) {
  return FOLDERS[key] || FOLDERS.general;
}

const status = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      configured: isCloudinaryConfigured(),
      folders: Object.keys(FOLDERS),
      limits: {
        maxFileSizeMb: 10,
        maxFiles: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      },
    },
  });
});

const uploadOne = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (field name: file)');

  const folderKey = req.body.folder || req.query.folder || 'general';
  const result = await uploadBuffer(req.file, {
    folder: resolveFolder(folderKey),
  });

  res.status(201).json({
    success: true,
    message: 'File uploaded',
    data: { file: result },
  });
});

const uploadManyHandler = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    throw new ApiError(400, 'No files uploaded (field name: files)');
  }

  const folderKey = req.body.folder || req.query.folder || 'general';
  const files = await uploadMany(req.files, {
    folder: resolveFolder(folderKey),
  });

  res.status(201).json({
    success: true,
    message: `${files.length} file(s) uploaded`,
    data: {
      files,
      urls: files.map((f) => f.url),
    },
  });
});

const deleteFile = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) throw new ApiError(400, 'publicId is required');

  const result = await destroyAsset(publicId);
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new ApiError(400, `Failed to delete asset: ${result.result}`);
  }

  res.json({
    success: true,
    message: 'File deleted',
    data: { result: result.result },
  });
});

module.exports = {
  status,
  uploadOne,
  uploadManyHandler,
  deleteFile,
};
