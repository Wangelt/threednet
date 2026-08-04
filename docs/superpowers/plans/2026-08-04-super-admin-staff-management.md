# Super Admin Staff Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `super_admin`-only `/admin-users` APIs and an Admins page in `3dwebadmin` so super admins can create, list, edit, and block/unblock admin accounts from the same desk.

**Architecture:** Dedicated Express routes gated with `authorize('super_admin')`. Next.js admin app keeps one login; sidebar shows Admins only when `role === 'super_admin'`. Ops routes stay `admin` + `super_admin`.

**Tech Stack:** Express, Mongoose, Joi, Next.js (App Router), TypeScript, existing admin UI patterns.

**Spec:** `docs/superpowers/specs/2026-08-04-super-admin-staff-management-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `threednet/src/validators/adminUserValidators.js` | Joi schemas for list query, create, update, block |
| `threednet/src/controllers/adminUserController.js` | list / create / update / block handlers |
| `threednet/src/routes/adminUserRoutes.js` | Wire auth + validate + controllers |
| `threednet/src/routes/index.js` | Mount `/admin-users` |
| `threednet/scripts/seed.js` | Seed `super_admin` |
| `threednet/.env.example` | Document seed env vars |
| `3dwebadmin/my-app/lib/auth.ts` | `isSuperAdminRole` |
| `3dwebadmin/my-app/lib/types.ts` | Staff admin type if needed |
| `3dwebadmin/my-app/components/layout/Sidebar.tsx` | Role-gated Admins nav |
| `3dwebadmin/my-app/app/(admin)/admins/page.tsx` | Staff management UI |

---

### Task 1: Validators

**Files:**
- Create: `threednet/src/validators/adminUserValidators.js`

- [ ] **Step 1: Add Joi validators**

```js
const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const listAdminUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const createAdminUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(128).required(),
});

const updateAdminUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  email: Joi.string().email({ tlds: { allow: false } }),
})
  .min(1)
  .messages({ 'object.min': 'At least one of name or email is required' });

const blockAdminUserSchema = Joi.object({
  isBlocked: Joi.boolean().required(),
});

const adminUserIdParamsSchema = Joi.object({
  id: objectId.required(),
});

module.exports = {
  listAdminUsersQuerySchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  blockAdminUserSchema,
  adminUserIdParamsSchema,
};
```

- [ ] **Step 2: Verify file loads**

Run: `node -e "require('./src/validators/adminUserValidators'); console.log('ok')"` from `threednet`  
Expected: `ok`

---

### Task 2: Controller

**Files:**
- Create: `threednet/src/controllers/adminUserController.js`

- [ ] **Step 1: Implement handlers**

```js
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

const listAdminUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const filter = { role: 'admin' };
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
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
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: 'admin',
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    message: 'Admin created',
    data: { user: user.toSafeObject() },
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

  await target.save();
  res.json({
    success: true,
    message: 'Admin updated',
    data: { user: target.toSafeObject() },
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
    data: { user: target.toSafeObject() },
  });
});

module.exports = {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  blockAdminUser,
};
```

- [ ] **Step 2: Verify require**

Run: `node -e "require('./src/controllers/adminUserController'); console.log('ok')"`  
Expected: `ok`

---

### Task 3: Routes + mount

**Files:**
- Create: `threednet/src/routes/adminUserRoutes.js`
- Modify: `threednet/src/routes/index.js`

- [ ] **Step 1: Create routes**

```js
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
```

- [ ] **Step 2: Mount in index**

Add require and: `router.use('/admin-users', adminUserRoutes);` after `/users`.

- [ ] **Step 3: Smoke-check router loads**

Run: `node -e "require('./src/routes'); console.log('ok')"`  
Expected: `ok`

---

### Task 4: Seed + env example

**Files:**
- Modify: `threednet/scripts/seed.js`
- Modify: `threednet/.env.example`

- [ ] **Step 1: After admin seed block, add super admin seed**

```js
  const superEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@3dforge.local';
  const superPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SuperAdmin12345!';

  let superAdmin = await User.findOne({ email: superEmail });
  if (!superAdmin) {
    superAdmin = await User.create({
      name: 'Platform Super Admin',
      email: superEmail,
      passwordHash: superPassword,
      role: 'super_admin',
      isEmailVerified: true,
    });
    console.log(`Super admin created: ${superEmail} / ${superPassword}`);
  } else if (superAdmin.role !== 'super_admin') {
    superAdmin.role = 'super_admin';
    superAdmin.isEmailVerified = true;
    await superAdmin.save();
    console.log(`Promoted existing user to super_admin: ${superEmail}`);
  } else {
    console.log(`Super admin already exists: ${superEmail}`);
  }
```

- [ ] **Step 2: Document in `.env.example`**

```
# Seed accounts (optional)
# SEED_ADMIN_EMAIL=admin@3dforge.local
# SEED_ADMIN_PASSWORD=Admin12345!
# SEED_SUPER_ADMIN_EMAIL=superadmin@3dforge.local
# SEED_SUPER_ADMIN_PASSWORD=SuperAdmin12345!
```

- [ ] **Step 3: Run seed** (when Mongo is up)

Run: `node scripts/seed.js` from `threednet`  
Expected: log line for super admin created or already exists

---

### Task 5: Admin UI auth + sidebar

**Files:**
- Modify: `3dwebadmin/my-app/lib/auth.ts`
- Modify: `3dwebadmin/my-app/lib/types.ts`
- Modify: `3dwebadmin/my-app/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add helper**

```ts
export function isSuperAdminRole(role?: string) {
  return role === "super_admin";
}
```

- [ ] **Step 2: Extend User type with optional staff fields used on Admins page**

Ensure `User` (or a `StaffAdmin` type) includes `isBlocked?: boolean` and `createdAt?: string`.

- [ ] **Step 3: Sidebar — build nav from base list + conditional Admins**

Use `Users` icon from lucide-react. Read `getUser()` in `useEffect` / state; only push Admins when `isSuperAdminRole(user?.role)`.

---

### Task 6: Admins page

**Files:**
- Create: `3dwebadmin/my-app/app/(admin)/admins/page.tsx`

- [ ] **Step 1: Build page** following coupons pattern:
  - Guard: if not super admin → `router.replace('/dashboard')`
  - `GET /admin-users` → table
  - Form create (name, email, password) / edit (name, email)
  - Block/unblock via `PATCH /admin-users/:id/block`
  - Update via `PATCH /admin-users/:id`

- [ ] **Step 2: Manual verify in browser**
  1. Login as super admin → Admins nav visible
  2. Create admin, edit, block/unblock
  3. Login as admin → no Admins nav; `/admins` redirects

---

### Task 7: Commits (only if user asks)

- [ ] Commit backend in `threednet` and note admin UI lives outside that git root unless user wants a separate commit strategy.

---

## Self-review vs spec

| Spec item | Task |
|-----------|------|
| GET/POST/PATCH/block `/admin-users` | 1–3 |
| super_admin only | 3 |
| Create admin with verified email | 2 |
| No self edit/block | 2 |
| List only admins | 2 |
| Seed super_admin | 4 |
| Same desk + Admins nav | 5–6 |
| Auto login / no role picker | (no change — already true) |
| No demote / no create super_admin | (omitted by design) |
