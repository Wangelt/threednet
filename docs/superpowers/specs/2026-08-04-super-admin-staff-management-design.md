# Super Admin Staff Management — Design

**Date:** 2026-08-04  
**Backend:** `threednet` (Express, Mongoose)  
**Admin UI:** `3dwebadmin/my-app` (Next.js)

## Goal

Give `super_admin` a first-class staff-management surface in the existing admin desk: create, list, edit, and block/unblock `admin` accounts. Login stays one form; the backend role drives which UI sections appear.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Login | Automatic from backend role — no Admin / Super Admin toggle |
| Super-admin exclusive power | Staff management only (not demote, not promote customers, not create another super_admin) |
| Portal shape | Same ops desk as admin + extra **Admins** nav for `super_admin` |
| Admin create flow | Create new admin with name, email, password |
| Staff actions | Create, list, block/unblock, edit name/email |
| API boundary | Dedicated `/admin-users` routes, `authorize('super_admin')` only |
| Ops APIs | Unchanged: continue `authorize('admin', 'super_admin')` |

## Out of scope (v1)

- Demote admin → customer
- Promote customer → admin
- Create or manage other `super_admin` accounts via API
- Password reset / force password change from Admins UI
- Separate super-admin app or route group
- Role picker on the login page

## Architecture

```
Login (email/password)
  → POST /api/auth/login
  → store accessToken + user (incl. role)
  → redirect /dashboard

Sidebar
  → base nav for admin + super_admin
  → "Admins" link only if role === super_admin

/admins page
  → client guard: non–super_admin → /dashboard
  → calls /api/admin-users/* (server enforces super_admin)
```

Security principle: UI gating is convenience; **authorization is always on the API**.

## Backend design

### Routes (`/api/admin-users`)

All routes: `authenticate` + `authorize('super_admin')`.

| Method | Path | Body / notes |
|--------|------|----------------|
| `GET` | `/admin-users` | List users with `role: 'admin'` only. Optional pagination (`page`, `limit`). |
| `POST` | `/admin-users` | `{ name, email, password }` → create `role: 'admin'`, `isEmailVerified: true`. |
| `PATCH` | `/admin-users/:id` | `{ name?, email? }` — target must be `admin`. |
| `PATCH` | `/admin-users/:id/block` | `{ isBlocked: boolean }` — target must be `admin`. |

Mount in `src/routes/index.js` as `router.use('/admin-users', adminUserRoutes)`.

### Files to add / touch

- `src/routes/adminUserRoutes.js` (new)
- `src/controllers/adminUserController.js` (new)
- `src/validators/adminUserValidators.js` (new)
- `src/routes/index.js` (mount)
- `scripts/seed.js` — seed a `super_admin`
- `.env.example` — `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`

### Business rules

1. Staff list never returns `customer` or `super_admin`.
2. Create always sets `role: 'admin'` (ignore any client-supplied role).
3. Create/update email uniqueness → `409` if taken.
4. Mutate/block: missing user → `404`; user exists but `role !== 'admin'` → `403`.
5. Cannot edit or block self (`req.user._id === target._id` → `403`). (Super admins are excluded from the staff list, so this mainly blocks forged IDs.)
6. Password on create uses existing User `passwordHash` pre-save hashing (pass plain password into `passwordHash` field, same as register/seed).
7. Responses use `user.toSafeObject()` (no password hash).

### Auth / seed

- Existing login already returns `role` and rejects blocked users — no login API change required beyond ensuring seed has a super admin.
- Seed: keep existing `admin` seed; add `super_admin` via `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` (defaults e.g. `superadmin@3dforge.local` / strong default password documented in seed output).

### Error map

| Case | Status |
|------|--------|
| Unauthenticated | 401 |
| Authenticated but not `super_admin` | 403 |
| Validation failure | 400 (existing validate middleware) |
| Email conflict | 409 |
| Target missing | 404 |
| Target exists but not admin | 403 |
| Self-mutation | 403 |

## Frontend design (`3dwebadmin`)

### Auth / shell

- `isAdminRole` stays `admin || super_admin` (login + shell unchanged).
- Add `isSuperAdminRole(role)` helper.
- `Sidebar`: append `{ href: '/admins', label: 'Admins', ... }` when `isSuperAdminRole`.
- Topbar already shows role string — no change required beyond optional label polish ("Super admin").

### Page: `/admins`

- Client-only page under `app/(admin)/admins/page.tsx`.
- On mount: if not super admin → `router.replace('/dashboard')`.
- UI pattern: follow Coupons page — `PageHeader`, create/edit form, `DataTable`, block/unblock actions, toast/error states.
- Columns: name, email, blocked status, createdAt, actions (Edit, Block/Unblock).
- Create form fields: name, email, password.
- Edit form fields: name, email (no password in v1).

### Login

- No role selector.
- After success, both roles go to `/dashboard`; portal “difference” is the Admins nav (and access to that page).

## Data flow

```
Super admin UI                API
─────────────────             ─────────────────────────
Load /admins       → GET      /admin-users
Submit create      → POST     /admin-users
Save edit          → PATCH    /admin-users/:id
Toggle block       → PATCH    /admin-users/:id/block
```

Normal `admin` never sees the nav; if they call the API, they get 403.

## Testing (manual)

1. Seed DB; login as super admin → ops pages + **Admins** visible.
2. Create admin; login as that admin → ops pages, no Admins; `/admins` redirects; direct API call 403.
3. Edit name/email; block admin → blocked admin cannot login; unblock restores access.
4. Super admin cannot block/edit own account.
5. Duplicate email on create returns clear error in UI.

## Success criteria

- Super admin can manage admin staff end-to-end from the same desk.
- Admin cannot access staff APIs or UI.
- Login remains a single automatic, role-driven flow.
