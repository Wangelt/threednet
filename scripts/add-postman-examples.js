/**
 * Adds Postman "Examples" (saved responses) under each request —
 * same UX as Success / Email Already Exists / Missing fields in the sidebar.
 *
 * Run: node scripts/add-postman-examples.js
 */
const fs = require('fs');
const path = require('path');

const COLLECTION = path.join(
  __dirname,
  '..',
  'postman',
  '3D_Forge_API.postman_collection.json'
);

const STATUS = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  503: 'Service Unavailable',
};

function ex(name, code, body) {
  return {
    name,
    status: STATUS[code] || String(code),
    code,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    cookie: [],
    body: JSON.stringify(body, null, 4),
  };
}

function ok(message, data) {
  return { success: true, message, data };
}

function err(message, details) {
  const b = { success: false, message };
  if (details) b.details = details;
  return b;
}

/** Examples keyed by exact Postman request name */
const EXAMPLES = {
  'Health Check': [
    ex('Success Response', 200, ok('3D Forge API is running')),
    ex('Route Not Found', 404, err('The requested API endpoint was not found.')),
    ex('Database Unavailable', 503, err('Database is temporarily unavailable. Please try again in a moment.')),
  ],

  Register: [
    ex(
      'Success Response',
      201,
      ok('Registered successfully. Please verify your email.', {
        user: {
          _id: '64f1a2b3c4d5e6f7a8b9c0d1',
          name: 'Postman User',
          email: 'postman@example.com',
          role: 'customer',
          isEmailVerified: false,
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      })
    ),
    ex('Email Already Exists', 409, err('Email already registered')),
    ex(
      'Missing / Invalid Fields',
      400,
      err('Validation failed', [
        '"name" is required',
        '"email" must be a valid email',
        '"password" length must be at least 8 characters long',
      ])
    ),
    ex('Too Many Attempts', 429, err('Too many auth attempts, try again later')),
  ],

  'Login (Customer)': [
    ex(
      'Success Response',
      200,
      ok('Logged in successfully', {
        user: {
          _id: '64f1a2b3c4d5e6f7a8b9c0d1',
          name: 'Postman User',
          email: 'postman@example.com',
          role: 'customer',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      })
    ),
    ex('Invalid Credentials', 401, err('Invalid email or password')),
    ex('Account Blocked', 403, err('Account is blocked')),
    ex(
      'Missing Fields',
      400,
      err('Validation failed', ['"email" is required', '"password" is required'])
    ),
    ex('Too Many Attempts', 429, err('Too many auth attempts, try again later')),
  ],

  'Login (Admin)': [
    ex(
      'Success Response',
      200,
      ok('Logged in successfully', {
        user: {
          _id: '64f1admin00000000000001',
          name: 'Platform Admin',
          email: 'admin@3dforge.local',
          role: 'admin',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      })
    ),
    ex('Invalid Credentials', 401, err('Invalid email or password')),
  ],

  Me: [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        user: {
          _id: '64f1a2b3c4d5e6f7a8b9c0d1',
          name: 'Postman User',
          email: 'postman@example.com',
          role: 'customer',
          addresses: [],
        },
      })
    ),
    ex('Unauthorized', 401, err('Authentication required')),
    ex('Invalid Token', 401, err('Invalid or expired access token')),
  ],

  Refresh: [
    ex('Success Response', 200, ok(undefined, { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })),
    ex('Refresh Token Required', 401, err('Refresh token required')),
    ex('Refresh Token Revoked', 401, err('Refresh token revoked')),
    ex('Invalid Refresh Token', 401, err('Invalid or expired refresh token')),
  ],

  'Forgot Password': [
    ex(
      'Success Response',
      200,
      ok('If that email exists, a reset link has been sent.')
    ),
    ex('Invalid Email', 400, err('Validation failed', ['"email" must be a valid email'])),
  ],

  'Reset Password': [
    ex('Success Response', 200, ok('Password reset successful. Please log in.')),
    ex('Invalid Or Expired Token', 400, err('Invalid or expired reset token')),
    ex(
      'Weak Password',
      400,
      err('Validation failed', ['"password" length must be at least 8 characters long'])
    ),
  ],

  'Verify Email': [
    ex(
      'Success Response',
      200,
      ok('Email verified successfully', {
        user: { email: 'postman@example.com', isEmailVerified: true },
      })
    ),
    ex('Invalid Or Expired Token', 400, err('Invalid or expired verification token')),
  ],

  Logout: [
    ex('Success Response', 200, ok('Logged out successfully')),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Update Addresses': [
    ex(
      'Success Response',
      200,
      ok('Addresses updated', {
        addresses: [
          {
            label: 'Home',
            fullName: 'Postman User',
            phone: '9876543210',
            city: 'Bengaluru',
            isDefault: true,
          },
        ],
      })
    ),
    ex('Validation Failed', 400, err('Validation failed', ['"addresses" is required'])),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Get User by ID (Admin)': [
    ex(
      'Success Response',
      200,
      ok(undefined, { user: { _id: '...', name: 'Postman User', email: 'postman@example.com' } })
    ),
    ex('Forbidden', 403, err('Insufficient permissions')),
    ex('Not Found', 404, err('User not found')),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'List Categories': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        categories: [{ _id: '...', name: 'Home Décor', slug: 'home-decor', isActive: true }],
      })
    ),
  ],

  'Create Category (Admin)': [
    ex(
      'Success Response',
      201,
      ok(undefined, { category: { _id: '...', name: 'Collectibles', slug: 'collectibles' } })
    ),
    ex('Validation Failed', 400, err('Validation failed', ['"name" is required'])),
    ex('Already Exists', 409, err('name already exists')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Update Category (Admin)': [
    ex('Success Response', 200, ok(undefined, { category: { _id: '...', description: 'Updated' } })),
    ex('Not Found', 404, err('Category not found')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Delete Category Soft (Admin)': [
    ex('Success Response', 200, ok('Category deactivated')),
    ex('Not Found', 404, err('Category not found')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'List Products': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        products: [
          {
            _id: '...',
            title: 'Geometric Desk Organizer',
            slug: 'geometric-desk-organizer',
            variants: [{ price: 999, stock: 25 }],
          },
        ],
        pagination: { page: 1, limit: 12, total: 1, pages: 1 },
      })
    ),
    ex('Invalid Query', 400, err('Validation failed', ['"sort" must be one of [newest, price_asc, ...]'])),
  ],

  'Get Product bySlug': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        product: {
          title: 'Geometric Desk Organizer',
          slug: 'geometric-desk-organizer',
          description: '...',
        },
      })
    ),
    ex('Not Found', 404, err('Product not found')),
  ],

  'Create Product (Admin)': [
    ex('Success Response', 201, ok(undefined, { product: { _id: '...', title: 'Phone Stand Pro', slug: 'phone-stand-pro' } })),
    ex('Validation Failed', 400, err('Validation failed', ['"variants" must contain at least 1 items'])),
    ex('Invalid Category', 400, err('Invalid or inactive category')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Update Product (Admin)': [
    ex('Success Response', 200, ok(undefined, { product: { _id: '...', isFeatured: true } })),
    ex('Not Found', 404, err('Product not found')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Delete Product Soft (Admin)': [
    ex('Success Response', 200, ok('Product deactivated')),
    ex('Not Found', 404, err('Product not found')),
  ],

  'Get Cart': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        cartId: '...',
        items: [],
        pricing: { subtotal: 0, discount: 0, shippingCost: 49, total: 49 },
      })
    ),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Add to Cart': [
    ex(
      'Success Response',
      201,
      ok('Added to cart', {
        items: [{ _id: '...', quantity: 1, lineTotal: 999 }],
        pricing: { subtotal: 999, discount: 0, shippingCost: 0, total: 999 },
      })
    ),
    ex('Insufficient Stock', 400, err('Insufficient stock')),
    ex('Invalid Variant', 400, err('Invalid product variant')),
    ex('Product Not Found', 404, err('Product not found')),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Update Cart Item': [
    ex('Success Response', 200, ok('Cart updated', { items: [{ quantity: 2 }] })),
    ex('Item Not Found', 404, err('Cart item not found')),
    ex('Insufficient Stock', 400, err('Insufficient stock')),
  ],

  'Apply Coupon': [
    ex(
      'Success Response',
      200,
      ok('Coupon applied', {
        couponApplied: { code: 'LAUNCH20', discountAmount: 200 },
        pricing: { subtotal: 999, discount: 200, shippingCost: 49, total: 848 },
      })
    ),
    ex('Invalid Coupon', 400, err('Invalid coupon code')),
    ex('Expired Coupon', 400, err('Coupon has expired')),
    ex('Min Order Not Met', 400, err('Minimum order value of ₹500 required')),
    ex('Empty Cart', 400, err('Cart is empty')),
  ],

  'Remove Coupon': [
    ex('Success Response', 200, ok('Coupon removed')),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Remove Cart Item': [
    ex('Success Response', 200, ok('Item removed')),
    ex('Item Not Found', 404, err('Cart item not found')),
  ],

  'Validate Coupon': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        code: 'LAUNCH20',
        discountType: 'percentage',
        discountValue: 20,
        discountAmount: 200,
      })
    ),
    ex('Invalid Coupon', 400, err('Invalid coupon code')),
    ex('Empty Cart', 400, err('Cart is empty')),
  ],

  'List Coupons (Admin)': [
    ex('Success Response', 200, ok(undefined, { coupons: [{ code: 'LAUNCH20', isActive: true }] })),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Create Coupon (Admin)': [
    ex('Success Response', 201, ok(undefined, { coupon: { code: 'SAVE50', discountType: 'flat' } })),
    ex('Already Exists', 409, err('code already exists')),
    ex('Validation Failed', 400, err('Validation failed', ['"expiresAt" must be greater than "now"'])),
  ],

  'Update Coupon (Admin)': [
    ex('Success Response', 200, ok(undefined, { coupon: { code: 'SAVE50', description: 'Updated' } })),
    ex('Not Found', 404, err('Coupon not found')),
  ],

  'Delete Coupon Soft (Admin)': [
    ex('Success Response', 200, ok('Coupon deactivated')),
    ex('Not Found', 404, err('Coupon not found')),
  ],

  'Create Order (COD)': [
    ex(
      'Success Response',
      201,
      ok('Order created', {
        order: {
          orderId: 'ORD-2026-00001',
          paymentMethod: 'cod',
          orderStatus: 'payment_confirmed',
          total: 848,
        },
      })
    ),
    ex('Empty Cart', 400, err('Cart is empty')),
    ex('COD Disabled', 400, err('Cash on Delivery is currently disabled')),
    ex('Insufficient Stock', 400, err('Insufficient stock for Geometric Desk Organizer')),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Create Order (Razorpay)': [
    ex(
      'Success Response',
      201,
      ok('Order created', {
        order: {
          orderId: 'ORD-2026-00002',
          paymentMethod: 'razorpay',
          paymentStatus: 'pending',
          orderStatus: 'pending',
          total: 999,
        },
      })
    ),
    ex('Empty Cart', 400, err('Cart is empty')),
  ],

  'My Orders': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        orders: [{ orderId: 'ORD-2026-00001', total: 848 }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      })
    ),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Get Order': [
    ex('Success Response', 200, ok(undefined, { order: { orderId: 'ORD-2026-00001', items: [] } })),
    ex('Forbidden', 403, err('Not allowed to access this order')),
    ex('Not Found', 404, err('Order not found')),
  ],

  'List Orders (Admin)': [
    ex('Success Response', 200, ok(undefined, { orders: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } })),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Update Order Status (Admin)': [
    ex('Success Response', 200, ok(undefined, { order: { orderId: 'ORD-2026-00001', orderStatus: 'shipped' } })),
    ex('Not Found', 404, err('Order not found')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Cancel Order': [
    ex('Success Response', 200, ok('Order cancelled', { order: { orderStatus: 'cancelled' } })),
    ex('Cannot Cancel', 400, err('Order can no longer be cancelled')),
    ex('Not Found', 404, err('Order not found')),
  ],

  'Create Razorpay Order': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        keyId: 'rzp_test_xxx',
        razorpayOrderId: 'order_TLaVlZ3F747OrK',
        amount: 99900,
        currency: 'INR',
        orderId: 'ORD-2026-00002',
      })
    ),
    ex('Not Razorpay Order', 400, err('Order is not a Razorpay payment order')),
    ex('Already Paid', 400, err('Order is already paid')),
    ex('Not Configured', 503, err('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')),
  ],

  'Verify Payment': [
    ex(
      'Success Response',
      200,
      ok('Payment verified', {
        order: { orderId: 'ORD-2026-00002', paymentStatus: 'paid', orderStatus: 'payment_confirmed' },
      })
    ),
    ex('Invalid Signature', 400, err('Invalid payment signature')),
    ex('Order Mismatch', 400, err('Razorpay order mismatch')),
  ],

  'Webhook (Razorpay)': [
    ex('Success Response', 200, { success: true }),
    ex('Missing Signature', 400, err('Missing webhook signature')),
    ex('Invalid Signature', 400, err('Invalid webhook signature')),
  ],

  'Get Wishlist': [
    ex('Success Response', 200, ok(undefined, { wishlistId: '...', products: [] })),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Add to Wishlist': [
    ex('Success Response', 201, ok('Added to wishlist', { products: [{ title: 'Geometric Desk Organizer' }] })),
    ex('Product Not Found', 404, err('Product not found')),
  ],

  'Move Wishlist Item to Cart': [
    ex('Success Response', 200, ok('Moved to cart', { items: [], pricing: {} })),
    ex('Not In Wishlist', 400, err('Product is not in wishlist')),
    ex('Insufficient Stock', 400, err('Insufficient stock')),
  ],

  'Remove from Wishlist': [
    ex('Success Response', 200, ok('Removed from wishlist', { products: [] })),
  ],

  'Create Review': [
    ex(
      'Success Response',
      201,
      ok(undefined, { review: { rating: 5, title: 'Great product', isVerifiedPurchase: true } })
    ),
    ex('Already Reviewed', 409, err('You already reviewed this product')),
    ex('Not Eligible', 400, err('Order is not eligible for reviews yet')),
    ex('Not Purchased', 403, err('You can only review products you purchased')),
  ],

  'List Product Reviews': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        reviews: [{ rating: 5, comment: 'Great' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      })
    ),
  ],

  'Update Review': [
    ex('Success Response', 200, ok(undefined, { review: { comment: 'Updated' } })),
    ex('Forbidden', 403, err('You can only edit your own review')),
    ex('Not Found', 404, err('Review not found')),
  ],

  'Mark Review Helpful': [
    ex('Success Response', 200, ok(undefined, { helpfulVotes: 3 })),
    ex('Already Voted', 400, err('You already marked this review as helpful')),
  ],

  'Hide Review (Admin)': [
    ex('Success Response', 200, ok('Review hidden')),
    ex('Not Found', 404, err('Review not found')),
  ],

  'List Notifications': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        notifications: [{ type: 'order_placed', title: 'Order placed', isRead: false }],
        unreadCount: 1,
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      })
    ),
  ],

  'Mark Notification Read': [
    ex('Success Response', 200, ok(undefined, { notification: { isRead: true } })),
    ex('Not Found', 404, err('Notification not found')),
  ],

  'Mark All Read': [
    ex('Success Response', 200, ok('All notifications marked as read', { modifiedCount: 3 })),
  ],

  'Delete Notification': [
    ex('Success Response', 200, ok('Notification deleted')),
    ex('Not Found', 404, err('Notification not found')),
  ],

  'Create Custom Order': [
    ex(
      'Success Response',
      201,
      ok('Custom order request submitted', {
        request: { requestId: 'COR-2026-00001', status: 'pending_review' },
      })
    ),
    ex(
      'Validation Failed',
      400,
      err('Validation failed', ['"description" length must be at least 10 characters long'])
    ),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'List Custom Orders': [
    ex('Success Response', 200, ok(undefined, { requests: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } })),
  ],

  'Get Custom Order': [
    ex('Success Response', 200, ok(undefined, { request: { requestId: 'COR-2026-00001' } })),
    ex('Forbidden', 403, err('Not allowed to access this request')),
    ex('Not Found', 404, err('Custom order request not found')),
  ],

  'Quote Custom Order (Admin)': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        request: {
          requestId: 'COR-2026-00001',
          status: 'quoted',
          quote: { amount: 1200, estimatedDays: 7 },
        },
      })
    ),
    ex('Quote Required', 400, err('Quote details required')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],

  'Accept Quote': [
    ex(
      'Success Response',
      200,
      ok('Quote accepted. Complete payment for the generated order.', {
        request: { status: 'accepted' },
        order: { orderId: 'ORD-2026-00003', total: 1200 },
      })
    ),
    ex('No Active Quote', 400, err('No active quote to accept')),
  ],

  'Reject Quote': [
    ex('Success Response', 200, ok('Quote rejected', { request: { status: 'rejected' } })),
    ex('No Active Quote', 400, err('No active quote to reject')),
  ],

  'Upload Status': [
    ex(
      'Success Response',
      200,
      ok(undefined, {
        configured: true,
        folders: ['products', 'categories', 'custom-orders', 'reviews', 'general'],
        limits: { maxFileSizeMb: 10, maxFiles: 5 },
      })
    ),
    ex('Unauthorized', 401, err('Authentication required')),
  ],

  'Upload Single Image': [
    ex(
      'Success Response',
      201,
      ok('File uploaded', {
        file: {
          url: 'https://res.cloudinary.com/demo/image/upload/v1/3dforge/products/abc.jpg',
          publicId: '3dforge/products/abc',
          width: 800,
          height: 800,
          format: 'jpg',
          bytes: 120000,
        },
      })
    ),
    ex('No File', 400, err('No file uploaded (field name: file)')),
    ex('Invalid Type', 400, err('Only JPEG, PNG, WebP, and GIF images are allowed')),
    ex('File Too Large', 400, err('File too large (max 10MB)')),
    ex(
      'Not Configured',
      503,
      err(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      )
    ),
  ],

  'Upload Multiple Images': [
    ex(
      'Success Response',
      201,
      ok('2 file(s) uploaded', {
        files: [{ url: 'https://...', publicId: '...' }],
        urls: ['https://...'],
      })
    ),
    ex('No Files', 400, err('No files uploaded (field name: files)')),
    ex('Too Many Files', 400, err('Too many files (max 5)')),
  ],

  'Delete Upload (Admin)': [
    ex('Success Response', 200, ok('File deleted', { result: 'ok' })),
    ex('Missing Public Id', 400, err('publicId is required')),
    ex('Forbidden', 403, err('Insufficient permissions')),
  ],
};

function attachExamples(items) {
  for (const item of items) {
    if (item.item) {
      attachExamples(item.item);
      continue;
    }
    const list = EXAMPLES[item.name];
    if (!list || !item.request) continue;

    const originalRequest = {
      method: item.request.method,
      header: item.request.header || [],
      url: item.request.url,
      ...(item.request.body ? { body: item.request.body } : {}),
    };

    item.response = list.map((r) => ({
      ...r,
      originalRequest,
    }));
  }
}

const collection = JSON.parse(fs.readFileSync(COLLECTION, 'utf8'));
attachExamples(collection.item);

collection.info.description = [
  '3D Forge MVP API',
  '',
  'Base URL: https://threednet.vercel.app/api',
  '',
  'Each request has saved Examples (expand the request in the sidebar):',
  'Success Response, validation errors, 401/403/404/409, etc.',
  '',
  'How to use:',
  '1. Re-import this collection',
  '2. Click a request → open Examples dropdown (or expand children under the request)',
  '3. Run Login (Admin) → List Products → customer Login for tokens',
  '',
  'Admin: admin@3dforge.local / Admin12345!',
].join('\n');

fs.writeFileSync(COLLECTION, JSON.stringify(collection, null, 2));
console.log('Examples attached to', COLLECTION);

let count = 0;
function countEx(items) {
  for (const i of items) {
    if (i.item) countEx(i.item);
    else if (i.response?.length) count += i.response.length;
  }
}
countEx(collection.item);
console.log('Total saved examples:', count);
