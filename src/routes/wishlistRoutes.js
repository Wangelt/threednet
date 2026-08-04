const express = require('express');
const wishlistController = require('../controllers/wishlistController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  addWishlistSchema,
  moveToCartSchema,
} = require('../validators/wishlistValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/add', validate(addWishlistSchema), wishlistController.addToWishlist);
router.delete(
  '/remove/:productId',
  wishlistController.removeFromWishlist
);
router.post(
  '/move-to-cart',
  validate(moveToCartSchema),
  wishlistController.moveToCart
);

module.exports = router;
