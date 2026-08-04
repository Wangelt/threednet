# Backend Phase A+B Design — Auth + Catalog

**Date:** 2026-08-04  
**Stack:** Node.js, Express 5, Mongoose, MongoDB, JWT (HTTP-only cookies), Joi

## Scope

- **In:** Auth, users (addresses), categories, products (search/filter/sort/paginate)
- **Out (later):** Cart, orders, Razorpay, wishlist, reviews, notifications, custom orders

## Architecture

```
src/
  config/       env + MongoDB
  models/       User, Category, Product
  middleware/   auth, validate, errors
  controllers/  route handlers
  routes/       /api/*
  validators/   Joi schemas
  utils/        tokens, email stub, ApiError
```

Layered REST API: routes → validate → auth → controllers → models.

## Decisions

| Topic | Choice |
|-------|--------|
| Language | CommonJS JavaScript |
| Auth tokens | JWT access (15m) + refresh (7d) in HTTP-only cookies; access also in JSON body |
| Email | Stub (console log) until SMTP configured |
| Soft deletes | Category/Product `isActive: false` |
| Validation | Joi; validated query stored on `req.validated.query` (Express 5) |

## Key endpoints

- `POST /api/auth/{register,login,logout,refresh,forgot-password,reset-password,verify-email}`
- `GET /api/auth/me`
- `PUT /api/users/addresses`, `GET /api/users/:id` (admin)
- `GET|POST|PUT|DELETE /api/categories`
- `GET /api/products`, `GET /api/products/:slug`, admin product CRUD
