const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  createOpaqueToken,
} = require('../utils/tokens');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/email');
const { nodeEnv } = require('../config/env');

const cookieOptions = {
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: nodeEnv === 'production' ? 'none' : 'lax',
  path: '/',
};

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
}

async function issueTokens(user, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Email already registered');

  const verifyToken = createOpaqueToken();
  const user = await User.create({
    name,
    email,
    passwordHash: password,
    phone: phone || undefined,
    emailVerifyToken: hashToken(verifyToken),
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await sendVerificationEmail(user, verifyToken);

  const tokens = await issueTokens(user, res);

  res.status(201).json({
    success: true,
    message: 'Registered successfully. Please verify your email.',
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.isBlocked) throw new ApiError(403, 'Account is blocked');

  await user.populate('location', 'name code city isActive');
  const tokens = await issueTokens(user, res);

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  }
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isBlocked) {
    throw new ApiError(401, 'User not found or blocked');
  }

  if (!user.refreshToken || user.refreshToken !== hashToken(token)) {
    throw new ApiError(401, 'Refresh token revoked');
  }

  const tokens = await issueTokens(user, res);

  res.json({
    success: true,
    data: { accessToken: tokens.accessToken },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });

  // Always succeed to avoid email enumeration
  if (user) {
    const rawToken = createOpaqueToken();
    user.passwordResetToken = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendPasswordResetEmail(user, rawToken);
  }

  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.passwordHash = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;
  await user.save();

  clearAuthCookies(res);

  res.json({
    success: true,
    message: 'Password reset successful. Please log in.',
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = hashToken(req.body.token);
  const user = await User.findOne({
    emailVerifyToken: hashed,
    emailVerifyExpires: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, 'Invalid or expired verification token');

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Email verified successfully',
    data: { user: user.toSafeObject() },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});

module.exports = {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  me,
};
