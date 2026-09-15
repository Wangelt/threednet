const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String },
    phone: { type: String },
    role: {
      type: String,
      enum: ['customer', 'admin', 'super_admin'],
      default: 'customer',
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: undefined,
    },
    isEmailVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    oauthProvider: {
      type: String,
      enum: ['google'],
      default: undefined,
    },
    oauthId: { type: String },
    addresses: [addressSchema],
    emailVerifyToken: { type: String },
    emailVerifyExpires: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('passwordHash') || !this.passwordHash) return;
  // Skip if already a bcrypt hash (re-save of existing hash)
  if (this.passwordHash.startsWith('$2')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.refreshToken;
  delete obj.emailVerifyToken;
  delete obj.passwordResetToken;
  delete obj.__v;
  return obj;
};

userSchema.index({ role: 1 });
userSchema.index({ phone: 1 });

module.exports = mongoose.model('User', userSchema);
