const express = require('express');
const notificationController = require('../controllers/notificationController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { notificationQuerySchema } = require('../validators/notificationValidators');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  validate(notificationQuerySchema, 'query'),
  notificationController.listNotifications
);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
