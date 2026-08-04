const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { updateAddressesSchema } = require('../validators/authValidators');

const router = express.Router();

router.put(
  '/addresses',
  authenticate,
  validate(updateAddressesSchema),
  userController.updateAddresses
);

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  userController.getUserById
);

module.exports = router;
