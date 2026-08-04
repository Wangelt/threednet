const express = require('express');
const productController = require('../controllers/productController');
const validate = require('../middleware/validate');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} = require('../validators/productValidators');

const router = express.Router();

router.get(
  '/',
  validate(productQuerySchema, 'query'),
  productController.listProducts
);

router.get('/:slug', optionalAuth, productController.getProductBySlug);

router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  productController.deleteProduct
);

module.exports = router;
