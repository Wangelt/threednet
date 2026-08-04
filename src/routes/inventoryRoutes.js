const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listInventoryQuerySchema,
  setInventorySchema,
} = require('../validators/inventoryValidators');

const router = express.Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get(
  '/',
  validate(listInventoryQuerySchema, 'query'),
  inventoryController.listInventory
);

router.patch(
  '/',
  validate(setInventorySchema),
  inventoryController.upsertInventory
);

module.exports = router;
