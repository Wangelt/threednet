const express = require('express');
const uploadController = require('../controllers/uploadController');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/status', authenticate, uploadController.status);

// Any authenticated user can upload (custom orders / reviews)
router.post('/image', authenticate, uploadSingle, uploadController.uploadOne);
router.post(
  '/images',
  authenticate,
  uploadMultiple,
  uploadController.uploadManyHandler
);

// Admin-only delete
router.delete(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  uploadController.deleteFile
);

module.exports = router;
