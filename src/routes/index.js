const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const adminUserRoutes = require('./adminUserRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const couponRoutes = require('./couponRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const customOrderRoutes = require('./customOrderRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: '3D Forge API is running' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin-users', adminUserRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/custom-orders', customOrderRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
