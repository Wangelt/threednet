const Location = require('../models/Location');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listLocations = asyncHandler(async (req, res) => {
  const { includeInactive } = req.validated.query;
  const filter = includeInactive ? {} : { isActive: true };
  const locations = await Location.find(filter).sort({ name: 1 });
  res.json({ success: true, data: { locations } });
});

const createLocation = asyncHandler(async (req, res) => {
  const code = req.body.code.toUpperCase();
  const existing = await Location.findOne({ code });
  if (existing) throw new ApiError(409, 'Location code already exists');

  const location = await Location.create({
    ...req.body,
    code,
  });

  res.status(201).json({
    success: true,
    message: 'Location created',
    data: { location },
  });
});

const updateLocation = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) throw new ApiError(404, 'Location not found');

  if (req.body.code) {
    const code = req.body.code.toUpperCase();
    const clash = await Location.findOne({ code, _id: { $ne: location._id } });
    if (clash) throw new ApiError(409, 'Location code already exists');
    req.body.code = code;
  }

  if (req.body.isActive === false) {
    const assigned = await User.countDocuments({
      role: 'admin',
      location: location._id,
    });
    if (assigned > 0) {
      throw new ApiError(
        400,
        'Reassign admins before deactivating this location'
      );
    }
  }

  Object.assign(location, req.body);
  await location.save();

  res.json({
    success: true,
    message: 'Location updated',
    data: { location },
  });
});

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
};
