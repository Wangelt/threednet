const express = require('express');
const categoryController = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
  createCategorySchema,
  updateCategorySchema,
} = require('../validators/categoryValidators');

const router = express.Router();

router.get('/', optionalAuth, categoryController.listCategories);

router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateCategorySchema),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  categoryController.deleteCategory
);

module.exports = router;
