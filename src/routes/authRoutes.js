const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} = require('../validators/authValidators');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, try again later' },
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/firebase-phone', authLimiter, authController.firebasePhoneLogin);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authLimiter, authController.refresh);
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  '/verify-email',
  authLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail
);
router.get('/me', authenticate, authController.me);

module.exports = router;
