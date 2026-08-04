# 3D Forge API

Node.js + Express + MongoDB backend for the 3D Forge e-commerce platform (MVP Phases A–D).

## Features

- Auth (JWT cookies), users, categories, products (search/filter)
- Cart, coupons, checkout, orders, Razorpay-ready payments
- Wishlist, reviews & ratings, notifications
- Custom order requests (quote → accept → order)
- Cloudinary image uploads (`/api/uploads`)

## Setup

1. Copy `.env.example` to `.env` and set `MONGO_URI` + JWT secrets.
2. Add Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
3. `npm install`
4. `npm run dev`
5. `npm run seed` — admin `admin@3dforge.local` / `Admin12345!`, coupon `LAUNCH20`

API base: `http://localhost:5000/api`

## Uploads

| Endpoint | Auth | Body |
|----------|------|------|
| `GET /api/uploads/status` | logged in | — |
| `POST /api/uploads/image` | logged in | multipart `file` + optional `folder` |
| `POST /api/uploads/images` | logged in | multipart `files` (max 5) + optional `folder` |
| `DELETE /api/uploads` | admin | JSON `{ "publicId": "..." }` |

`folder` values: `products`, `categories`, `custom-orders`, `reviews`, `general`

Use returned `url` values in product/category/review/custom-order payloads.

## Notes

- Emails stub to console until SMTP is configured.
- Razorpay / Cloudinary endpoints return 503 until keys are set; COD works without Razorpay.
- Custom quote accept creates a pending order for payment.
