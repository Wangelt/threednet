const { v2: cloudinary } = require('cloudinary');
const { cloudinary: cfg } = require('../config/env');
const ApiError = require('../utils/ApiError');

function isCloudinaryConfigured() {
  return Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);
}

function ensureConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cfg.cloudName,
    api_key: cfg.apiKey,
    api_secret: cfg.apiSecret,
    secure: true,
  });
}

/**
 * Upload a multer memory-file buffer to Cloudinary.
 * @param {Express.Multer.File} file
 * @param {{ folder?: string, resourceType?: string }} options
 */
function uploadBuffer(file, options = {}) {
  ensureConfigured();

  const folder = options.folder || cfg.folder;
  const resourceType = options.resourceType || 'image';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        overwrite: false,
        unique_filename: true,
        use_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    stream.end(file.buffer);
  });
}

async function uploadMany(files, options = {}) {
  const uploads = [];
  for (const file of files) {
    // sequential to avoid burst rate issues on free tier
    // eslint-disable-next-line no-await-in-loop
    uploads.push(await uploadBuffer(file, options));
  }
  return uploads;
}

async function destroyAsset(publicId, resourceType = 'image') {
  ensureConfigured();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

module.exports = {
  isCloudinaryConfigured,
  uploadBuffer,
  uploadMany,
  destroyAsset,
};
