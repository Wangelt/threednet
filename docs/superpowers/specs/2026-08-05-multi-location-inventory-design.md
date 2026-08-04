# Multi-Location Inventory & Ops Scoping — Design

**Date:** 2026-08-05  
**Backend:** `threednet`  
**Admin UI:** `3dwebadmin/my-app`  
**Depends on:** Super admin staff management (`2026-08-04-super-admin-staff-management-design.md`)

## Goal

Support multiple fulfillment locations so each `admin` works against one location’s inventory and orders, while `super_admin` can view overall stock/orders and filter by location. The customer storefront keeps a single shared catalog and sees **aggregated** stock.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Catalog | Shared — any `admin` or `super_admin` can create/edit product catalog fields |
| Stock | Per location (`Inventory` collection); `variant.stock` = cached sum |
| Orders | Per location; auto-assign at checkout to a location that can fulfill all lines |
| Storefront stock | Sum across active locations |
| Locations CRUD | `super_admin` only |
| Admin ↔ location | Each `admin` has required `locationId`; `super_admin` has none |
| Stock edits | Location admin → own location only; super admin → any / all |
| Order list | Location admin → own location; super admin → all + optional `locationId` filter |
| Split shipments | Out of scope v1 |
| Customer location picker | Out of scope v1 |

## Architecture

```
Location  <── locationId ── User (admin)
    │
    └── Inventory (product, variantId, location, stock)
              │
Product.variants[].stock  =  sum(Inventory.stock) for that variantId

Order.locationId  ← auto-assigned at create; stock decremented there
```

Security: UI filters are convenience; APIs enforce location scope from `req.user`.

## Data model

### Location
- `name` (required)
- `code` (required, unique, uppercase short code e.g. `MAIN`, `PNQ`)
- `city` (optional)
- `address` (optional string)
- `isActive` (default true)
- timestamps

### User
- Add optional `location` (ObjectId → Location)
- Validation rule: if `role === 'admin'`, `location` is required
- `super_admin` must not require location (ignore/clear on create if sent)

### Inventory
- `product` (ObjectId → Product, required)
- `variantId` (ObjectId, required)
- `location` (ObjectId → Location, required)
- `stock` (Number, min 0, default 0)
- Unique compound index: `{ variantId: 1, location: 1 }`
- Index: `{ location: 1, product: 1 }`

### Product
- Unchanged catalog shape
- `variants[].stock` remains the **total** used by cart/wishlist/storefront
- Admin product payloads may include `stockByLocation: [{ locationId, locationCode?, stock }]` (read) and accept location-scoped stock updates via inventory API (preferred) rather than trusting raw `variants[].stock` from location admins

### Order
- Add `location` (ObjectId → Location, required for new orders after migration)
- Existing orders backfilled to default location

## Backend behavior

### Stock sync helper
Central service functions (e.g. `inventoryService.js`):
- `getStock(variantId, locationId)`
- `setStock({ productId, variantId, locationId, stock })` → upsert inventory, then `recomputeVariantTotal(productId, variantId)`
- `adjustStock({ variantId, locationId, delta })` → for order place/cancel
- `recomputeVariantTotal` → sum inventory rows → write `variant.stock`
- `pickFulfillmentLocation(cartLines)` → among active locations that can satisfy every line qty, choose the location with the **highest sum of available stock** across those lines; if none, throw insufficient stock

### Checkout / orders
- Before create: validate totals via aggregated `variant.stock` (unchanged UX)
- Resolve `locationId` via `pickFulfillmentLocation`
- Decrement inventory at that location; recompute totals
- Persist `order.location`
- On cancel/restock: credit the **order’s** location inventory (not “any” location)

### Product create/update
- Catalog fields: `authorize('admin', 'super_admin')` (unchanged)
- If request includes per-variant stock:
  - **admin:** apply stock only to `req.user.location` via inventory service; do not let them overwrite other locations’ rows; after write, total = recompute
  - **super_admin:** may set stock for a specified `locationId`, or set totals only by writing one location at a time (UI); avoid ambiguous “set variant.stock directly” that desyncs inventory — prefer inventory writes always

### List filtering
- `GET /orders`: if admin → force `location = req.user.location`; if super_admin → optional `locationId` query
- `GET /inventory`: same scoping rules
- Dashboard metrics for admin should respect location scope where they pull orders/products stock

## API surface

### `/locations` (super_admin)
| Method | Path | Notes |
|--------|------|--------|
| GET | `/locations` | List (include inactive optional query) |
| POST | `/locations` | Create |
| PATCH | `/locations/:id` | Update fields / `isActive` |
| Rules | Deactivate blocked if any admin still assigned to that location → 400 |

### `/admin-users` (extend)
- Create/update body: require `locationId` when creating `admin`
- List/detail: populate location `{ _id, name, code }`
- Block creating admin without location → 400

### `/inventory`
| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/inventory` | admin, super_admin | Query: `locationId?`, `productId?`. Admin location forced. |
| PATCH | `/inventory` | admin, super_admin | Body: `{ productId, variantId, stock, locationId? }`. Admin ignores/forbids other locationId. |

### Products / orders
- Product get (admin): include `stockByLocation` per variant when requester is staff
- Order list/detail: include populated location; enforce scope
- Order create: auto-assign + inventory adjust (internal)

## Admin UI

### Nav
- **Locations** — super_admin only
- Existing **Admins** — add location select
- Topbar: show location name for admins (“Pune · PNQ”); super admin shows “All locations”

### Pages
1. **Locations** — table + create/edit (name, code, city, address, active)
2. **Admins** — location required on create; editable on update
3. **Products** — catalog editable by all staff; stock input:
   - admin: single “Stock at {location}” per variant
   - super_admin: location filter/selector + edit that location’s stock; display total
4. **Orders** — location column; super_admin filter dropdown; admin sees only theirs

### Login
- Unchanged (role + location come from `/auth/login` / `me` user payload). Ensure login/`me` returns `location` populated for admins.

## Migration

Run as part of seed or `scripts/migrate-locations.js` (idempotent):

1. Upsert Location `code: MAIN`, name `Main warehouse`
2. For every product variant: upsert Inventory for MAIN with `stock: variant.stock` (if inventory row missing)
3. Recompute all variant totals from inventory
4. Set `User.location = MAIN` for all `role: admin` missing location
5. Set `Order.location = MAIN` where missing

## Out of scope (v1)

- Multi-location split fulfillment on one order
- Stock transfers UI between locations
- Customer chooses warehouse/city at checkout
- Restricting which locations a product is “sellable” at beyond zero stock
- Custom orders location scoping (follow-up; not in v1)

## Success criteria

- Two locations with different stocks; storefront shows sum; checkout assigns one capable location and decrements only there
- Location admin cannot see or change another location’s stock/orders
- Super admin can view overall and filter by location
- Existing data migrates to MAIN without losing stock counts
