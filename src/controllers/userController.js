const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

const updateAddresses = asyncHandler(async (req, res) => {
  const { addresses } = req.body;

  if (addresses.length > 0 && !addresses.some((a) => a.isDefault)) {
    addresses[0].isDefault = true;
  }

  // Ensure only one default
  let defaultSeen = false;
  for (const addr of addresses) {
    if (addr.isDefault) {
      if (defaultSeen) addr.isDefault = false;
      else defaultSeen = true;
    }
  }

  req.user.addresses = addresses;
  await req.user.save();

  res.json({
    success: true,
    message: 'Addresses updated',
    data: { addresses: req.user.addresses },
  });
});

module.exports = { getUserById, updateAddresses };
