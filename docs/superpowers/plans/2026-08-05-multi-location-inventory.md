# Multi-Location Inventory Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or implement task-by-task inline.

**Goal:** Locations + per-location inventory; admins scoped to one location; super admin sees all / filters; checkout auto-assigns location.

**Architecture:** `Location` + `Inventory` models; `inventoryService` owns stock sync and fulfillment pick; `variant.stock` remains aggregated cache; orders carry `location`.

**Tech Stack:** Express, Mongoose, Next.js admin app.

**Spec:** `docs/superpowers/specs/2026-08-05-multi-location-inventory-design.md`

---

## File map

| File | Role |
|------|------|
| `src/models/Location.js` | Location schema |
| `src/models/Inventory.js` | Per variant×location stock |
| `src/services/inventoryService.js` | set/adjust/recompute/pick location |
| `src/models/User.js` | `location` ref |
| `src/models/Order.js` | `location` ref |
| `src/routes|controllers|validators` for locations + inventory | CRUD/API |
| Admin users + auth populate | Assign location |
| `cartService.decrementStock` + order cancel | Use inventory |
| `orderService` / list orders | Scope by location |
| `scripts/seed.js` + migrate | MAIN backfill |
| Admin UI: locations, admins, products stock, orders filter, topbar | |

### Tasks
1. Models + inventoryService  
2. Location + inventory APIs  
3. Wire orders/products/admin-users/auth  
4. Seed/migrate  
5. Admin UI  

No automated tests in repo — verify with smoke API calls + manual UI.
