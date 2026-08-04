const Location = require('../models/Location');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function assertNotSelf(req, targetId) {
  if (req.user._id.toString() === targetId.toString()) {
    throw new ApiError(403, 'Cannot modify your own account');
  }
}

async function loadTargetAdmin(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'Admin not found');
  if (user.role !== 'admin') throw new ApiError(403, 'Target user is not an admin');
  return user;
}

async function ensureLocation(locationId) {
  const location = await Location.findById(locationId);
  if (!location || !location.isActive) {
    throw new ApiError(400, 'Invalid or inactive location');
  }
  return location;
}

async function toAdminPayload(user) {
  await user.populate('location', 'name code city isActive');
  return user.toSafeObject();
}

const listAdminUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const filter = { role: 'admin' };
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('location', 'name code city isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users: users.map((u) => u.toSafeObject()),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    },
  });
});

const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password, locationId } = req.body;
  await ensureLocation(locationId);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: 'admin',
    location: locationId,
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    message: 'Admin created',
    data: { user: await toAdminPayload(user) },
  });
});

const updateAdminUser = asyncHandler(async (req, res) => {
  const target = await loadTargetAdmin(req.params.id);
  assertNotSelf(req, target._id);

  if (req.body.email) {
    const email = req.body.email.toLowerCase();
    const clash = await User.findOne({ email, _id: { $ne: target._id } });
    if (clash) throw new ApiError(409, 'Email already registered');
    target.email = email;
  }
  if (req.body.name) target.name = req.body.name;
  if (req.body.locationId) {
    await ensureLocation(req.body.locationId);
    target.location = req.body.locationId;
  }

  await target.save();
  res.json({
    success: true,
    message: 'Admin updated',
    data: { user: await toAdminPayload(target) },
  });
});

const blockAdminUser = asyncHandler(async (req, res) => {
  const target = await loadTargetAdmin(req.params.id);
  assertNotSelf(req, target._id);
  target.isBlocked = req.body.isBlocked;
  await target.save();

  res.json({
    success: true,
    message: target.isBlocked ? 'Admin blocked' : 'Admin unblocked',
    data: { user: await toAdminPayload(target) },
  });
});

module.exports = {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  blockAdminUser,
};
