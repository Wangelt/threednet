const express = require('express');
const reviewController = require('../controllers/reviewController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
} = require('../validators/reviewValidators');

const router = express.Router();

router.get(
  '/product/:productId',
  validate(reviewQuerySchema, 'query'),
  reviewController.getProductReviews
);

router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  reviewController.createReview
);

router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  reviewController.updateReview
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  reviewController.hideReview
);

router.post(
  '/:id/helpful',
  authenticate,
  reviewController.markHelpful
);

module.exports = router;
