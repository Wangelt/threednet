const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listAdminUsersQuerySchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  blockAdminUserSchema,
  adminUserIdParamsSchema,
} = require('../validators/adminUserValidators');

const router = express.Router();

router.use(authenticate, authorize('super_admin'));

router.get(
  '/',
  validate(listAdminUsersQuerySchema, 'query'),
  adminUserController.listAdminUsers
);

router.post(
  '/',
  validate(createAdminUserSchema),
  adminUserController.createAdminUser
);

router.patch(
  '/:id',
  validate(adminUserIdParamsSchema, 'params'),
  validate(updateAdminUserSchema),
  adminUserController.updateAdminUser
);

router.patch(
  '/:id/block',
  validate(adminUserIdParamsSchema, 'params'),
  validate(blockAdminUserSchema),
  adminUserController.blockAdminUser
);

module.exports = router;
