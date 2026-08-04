const express = require('express');
const locationController = require('../controllers/locationController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listLocationsQuerySchema,
  createLocationSchema,
  updateLocationSchema,
  locationIdParamsSchema,
} = require('../validators/locationValidators');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'super_admin'),
  validate(listLocationsQuerySchema, 'query'),
  locationController.listLocations
);

router.post(
  '/',
  authorize('super_admin'),
  validate(createLocationSchema),
  locationController.createLocation
);

router.patch(
  '/:id',
  authorize('super_admin'),
  validate(locationIdParamsSchema, 'params'),
  validate(updateLocationSchema),
  locationController.updateLocation
);

module.exports = router;
