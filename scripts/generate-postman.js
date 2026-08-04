const fs = require('fs');
const path = require('path');

function outcomeDesc(lines) {
  return `Possible outcomes:\n${lines.map((l) => `- ${l}`).join('\n')}`;
}

const BASE_TEST = [
  'const code = pm.response.code;',
  'let json = {};',
  'try { json = pm.response.json(); } catch (e) { json = { parseError: true }; }',
  'const ok = code >= 200 && code < 300;',
  'const label = ok ? "SUCCESS" : "ERROR";',
  'console.log("=".repeat(50));',
  'console.log(label + " | HTTP " + code);',
  'console.log("success:", json.success);',
  'console.log("message:", json.message || "(none)");',
  'if (json.details) console.log("details:", JSON.stringify(json.details));',
  'if (json.data) console.log("data keys:", Object.keys(json.data).join(", "));',
  'console.log("=".repeat(50));',
  '',
  'pm.test("Response is valid JSON", function () {',
  '  pm.expect(json.parseError).to.not.eql(true);',
  '});',
  '',
  'pm.test("Body has success boolean", function () {',
  '  pm.expect(json).to.have.property("success");',
  '  pm.expect(json.success).to.be.a("boolean");',
  '});',
  '',
  'if (ok) {',
  '  pm.test("SUCCESS: success === true", function () {',
  '    pm.expect(json.success).to.eql(true);',
  '  });',
  '} else {',
  '  pm.test("ERROR: success === false", function () {',
  '    pm.expect(json.success).to.eql(false);',
  '  });',
  '  pm.test("ERROR: message is present", function () {',
  '    pm.expect(json.message).to.be.a("string").and.not.empty;',
  '  });',
  '}',
  '',
];

function testEvent(extra = []) {
  return {
    listen: 'test',
    script: { type: 'text/javascript', exec: [...BASE_TEST, ...extra] },
  };
}

function req(name, method, url, opts = {}) {
  const headers = [...(opts.headers || [])];
  if (opts.auth === 'user') {
    headers.unshift({ key: 'Authorization', value: 'Bearer {{accessToken}}' });
  }
  if (opts.auth === 'admin') {
    headers.unshift({ key: 'Authorization', value: 'Bearer {{adminToken}}' });
  }

  return {
    name,
    event: opts.event ? [opts.event] : [testEvent()],
    request: {
      method,
      header: headers,
      url,
      description: opts.description || '',
      ...(opts.body ? { body: opts.body } : {}),
    },
  };
}

function jsonHeaders() {
  return [{ key: 'Content-Type', value: 'application/json' }];
}

function raw(obj) {
  return {
    mode: 'raw',
    raw: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2),
  };
}

function folder(name, item) {
  return { name, item };
}

const collection = {
  info: {
    _postman_id: '3dforge-api-collection-001',
    name: '3D Forge API',
    description: [
      '3D Forge MVP API — each request documents SUCCESS / ERROR outcomes.',
      '',
      'Base URL: https://threednet.vercel.app/api',
      '',
      'How to use:',
      '1. Import this collection into Postman',
      '2. Open Test Results + Postman Console after each request',
      '3. Run Login (Admin) → List Products (auto-saves IDs)',
      '4. Run Register or Login (Customer) for accessToken',
      '',
      'Admin: admin@3dforge.local / Admin12345!',
      'Coupon: LAUNCH20',
    ].join('\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'https://threednet.vercel.app/api' },
    { key: 'accessToken', value: '' },
    { key: 'adminToken', value: '' },
    { key: 'productId', value: '' },
    { key: 'variantId', value: '' },
    { key: 'productSlug', value: '' },
    { key: 'categoryId', value: '' },
    { key: 'cartItemId', value: '' },
    { key: 'orderId', value: '' },
    { key: 'couponId', value: '' },
    { key: 'couponCode', value: 'LAUNCH20' },
    { key: 'reviewId', value: '' },
    { key: 'notificationId', value: '' },
    { key: 'customOrderId', value: '' },
    { key: 'userId', value: '' },
    { key: 'uploadPublicId', value: '' },
    { key: 'uploadUrl', value: '' },
  ],
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          'console.log("→", pm.info.requestName, "|", pm.request.method, pm.request.url.toString());',
        ],
      },
    },
  ],
  item: [],
};

collection.item = [
  folder('0. Health', [
    req('Health Check', 'GET', '{{baseUrl}}/health', {
      description: outcomeDesc([
        '✅ 200 — { success: true, message: "3D Forge API is running" }',
        '❌ 404 — Wrong baseUrl / missing /api',
        '❌ 5xx — Server/deploy error',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: health message", function () {',
        '    pm.expect(json.message).to.include("running");',
        '  });',
        '}',
      ]),
    }),
  ]),

  folder('1. Auth', [
    req('Register', 'POST', '{{baseUrl}}/auth/register', {
      headers: jsonHeaders(),
      body: raw({
        name: 'Postman User',
        email: 'postman{{$timestamp}}@example.com',
        password: 'Password123!',
        phone: '9876543210',
      }),
      description: outcomeDesc([
        '✅ 201 — Registered; user + accessToken; cookies set',
        '❌ 400 — Validation failed',
        '❌ 409 — Email already registered',
        '❌ 429 — Too many auth attempts',
      ]),
      event: testEvent([
        'if (code === 201) {',
        '  pm.test("SUCCESS: accessToken returned", function () {',
        '    pm.expect(json.data.accessToken).to.be.a("string").and.not.empty;',
        '  });',
        '  pm.collectionVariables.set("accessToken", json.data.accessToken);',
        '  if (json.data.user) pm.collectionVariables.set("userId", json.data.user._id);',
        '}',
        'if (code === 409) {',
        '  pm.test("ERROR: duplicate email", function () {',
        '    pm.expect(json.message.toLowerCase()).to.include("email");',
        '  });',
        '}',
      ]),
    }),
    req('Login (Customer)', 'POST', '{{baseUrl}}/auth/login', {
      headers: jsonHeaders(),
      body: raw({ email: 'postman@example.com', password: 'Password123!' }),
      description: outcomeDesc([
        '✅ 200 — Logged in; user + accessToken',
        '❌ 400 — Validation failed',
        '❌ 401 — Invalid email or password',
        '❌ 403 — Account is blocked',
        '❌ 429 — Rate limited',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: token + user", function () {',
        '    pm.expect(json.data.accessToken).to.be.ok;',
        '    pm.expect(json.data.user.email).to.be.a("string");',
        '  });',
        '  pm.collectionVariables.set("accessToken", json.data.accessToken);',
        '  if (json.data.user) pm.collectionVariables.set("userId", json.data.user._id);',
        '}',
      ]),
    }),
    req('Login (Admin)', 'POST', '{{baseUrl}}/auth/login', {
      headers: jsonHeaders(),
      body: raw({ email: 'admin@3dforge.local', password: 'Admin12345!' }),
      description: outcomeDesc([
        '✅ 200 — Admin logged in; sets adminToken',
        '❌ 401 — Invalid credentials / admin not seeded',
        '❌ 429 — Rate limited',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: admin role", function () {',
        '    pm.expect(["admin","super_admin"]).to.include(json.data.user.role);',
        '  });',
        '  pm.collectionVariables.set("adminToken", json.data.accessToken);',
        '  pm.collectionVariables.set("accessToken", json.data.accessToken);',
        '}',
      ]),
    }),
    req('Me', 'GET', '{{baseUrl}}/auth/me', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Current user (no passwordHash)',
        '❌ 401 — Authentication required / invalid token',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: safe user object", function () {',
        '    pm.expect(json.data.user).to.be.an("object");',
        '    pm.expect(json.data.user).to.not.have.property("passwordHash");',
        '  });',
        '}',
      ]),
    }),
    req('Refresh', 'POST', '{{baseUrl}}/auth/refresh', {
      headers: jsonHeaders(),
      body: raw({}),
      description: outcomeDesc([
        '✅ 200 — New accessToken (needs refresh cookie from Login)',
        '❌ 401 — Refresh token required / invalid / revoked',
        'Note: Enable cookies in Postman for success after Login',
      ]),
    }),
    req('Forgot Password', 'POST', '{{baseUrl}}/auth/forgot-password', {
      headers: jsonHeaders(),
      body: raw({ email: 'admin@3dforge.local' }),
      description: outcomeDesc([
        '✅ 200 — Always generic success (no email enumeration)',
        '❌ 400 — Invalid email format',
        '❌ 429 — Rate limited',
      ]),
    }),
    req('Reset Password', 'POST', '{{baseUrl}}/auth/reset-password', {
      headers: jsonHeaders(),
      body: raw({
        token: 'PASTE_TOKEN_FROM_SERVER_LOG',
        password: 'NewPassword123!',
      }),
      description: outcomeDesc([
        '✅ 200 — Password reset successful',
        '❌ 400 — Invalid/expired token or validation failed',
      ]),
    }),
    req('Verify Email', 'POST', '{{baseUrl}}/auth/verify-email', {
      headers: jsonHeaders(),
      body: raw({ token: 'PASTE_TOKEN_FROM_SERVER_LOG' }),
      description: outcomeDesc([
        '✅ 200 — Email verified',
        '❌ 400 — Invalid or expired verification token',
      ]),
    }),
    req('Logout', 'POST', '{{baseUrl}}/auth/logout', {
      auth: 'user',
      headers: jsonHeaders(),
      description: outcomeDesc([
        '✅ 200 — Logged out',
        '❌ 401 — Authentication required',
      ]),
    }),
  ]),

  folder('2. Users', [
    req('Update Addresses', 'PUT', '{{baseUrl}}/users/addresses', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        addresses: [
          {
            label: 'Home',
            fullName: 'Postman User',
            phone: '9876543210',
            line1: '12 MG Road',
            city: 'Bengaluru',
            state: 'KA',
            pincode: '560001',
            isDefault: true,
          },
        ],
      }),
      description: outcomeDesc([
        '✅ 200 — Addresses updated',
        '❌ 400 — Validation failed',
        '❌ 401 — Authentication required',
      ]),
    }),
    req('Get User by ID (Admin)', 'GET', '{{baseUrl}}/users/{{userId}}', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — User safe object',
        '❌ 401 — Auth required',
        '❌ 403 — Not admin',
        '❌ 404 — User not found',
      ]),
    }),
  ]),

  folder('3. Categories', [
    req('List Categories', 'GET', '{{baseUrl}}/categories', {
      description: outcomeDesc([
        '✅ 200 — Active categories array',
        '❌ 5xx — Server error',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: categories array", function () {',
        '    pm.expect(json.data.categories).to.be.an("array");',
        '  });',
        '  if (json.data.categories[0]) pm.collectionVariables.set("categoryId", json.data.categories[0]._id);',
        '}',
      ]),
    }),
    req('Create Category (Admin)', 'POST', '{{baseUrl}}/categories', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({
        name: 'Collectibles',
        description: 'Figurines and collectibles',
        sortOrder: 2,
      }),
      description: outcomeDesc([
        '✅ 201 — Created',
        '❌ 400 — Validation failed',
        '❌ 401/403 — Auth / not admin',
        '❌ 409 — Name/slug exists',
      ]),
      event: testEvent([
        'if (code === 201) pm.collectionVariables.set("categoryId", json.data.category._id);',
      ]),
    }),
    req('Update Category (Admin)', 'PUT', '{{baseUrl}}/categories/{{categoryId}}', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({ description: 'Updated category description' }),
      description: outcomeDesc([
        '✅ 200 — Updated',
        '❌ 400 — Validation / bad id',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
    req('Delete Category Soft (Admin)', 'DELETE', '{{baseUrl}}/categories/{{categoryId}}', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — Deactivated (isActive: false)',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('4. Products', [
    req(
      'List Products',
      'GET',
      {
        raw: '{{baseUrl}}/products?page=1&limit=12&sort=newest',
        host: ['{{baseUrl}}'],
        path: ['products'],
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '12' },
          { key: 'sort', value: 'newest' },
          { key: 'q', value: '', disabled: true },
          { key: 'minPrice', value: '100', disabled: true },
          { key: 'maxPrice', value: '2000', disabled: true },
          { key: 'material', value: 'PLA', disabled: true },
          { key: 'inStock', value: 'true', disabled: true },
          { key: 'rating', value: '4', disabled: true },
          { key: 'featured', value: 'true', disabled: true },
        ],
      },
      {
        description: outcomeDesc([
          '✅ 200 — { products, pagination }',
          '❌ 400 — Invalid query params',
          'Note: empty products[] if catalog empty',
        ]),
        event: testEvent([
          'if (code === 200) {',
          '  pm.test("SUCCESS: products + pagination", function () {',
          '    pm.expect(json.data.products).to.be.an("array");',
          '    pm.expect(json.data.pagination).to.include.keys("page","limit","total","pages");',
          '  });',
          '  const p = json.data.products[0];',
          '  if (p) {',
          '    pm.collectionVariables.set("productId", p._id);',
          '    pm.collectionVariables.set("productSlug", p.slug);',
          '    if (p.variants && p.variants[0]) pm.collectionVariables.set("variantId", p.variants[0]._id);',
          '  }',
          '}',
        ]),
      }
    ),
    req('Get Product bySlug', 'GET', '{{baseUrl}}/products/{{productSlug}}', {
      description: outcomeDesc([
        '✅ 200 — Full product + category',
        '❌ 404 — Not found / inactive',
      ]),
    }),
    req('Create Product (Admin)', 'POST', '{{baseUrl}}/products', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({
        title: 'Phone Stand Pro',
        description: 'Stable PLA phone stand with cable slot',
        shortDesc: 'Cable-friendly phone stand',
        category: '{{categoryId}}',
        tags: ['phone', 'stand'],
        images: ['https://placehold.co/800x800/png?text=Phone+Stand'],
        variants: [
          {
            label: 'Black - PLA',
            material: 'PLA',
            color: 'Black',
            price: 499,
            stock: 30,
            sku: 'PS-BK-PLA',
          },
        ],
        isFeatured: true,
      }),
      description: outcomeDesc([
        '✅ 201 — Created',
        '❌ 400 — Validation / invalid category',
        '❌ 401/403 — Auth / not admin',
        '❌ 409 — Slug exists',
      ]),
      event: testEvent([
        'if (code === 201) {',
        '  const p = json.data.product;',
        '  pm.collectionVariables.set("productId", p._id);',
        '  pm.collectionVariables.set("productSlug", p.slug);',
        '  if (p.variants[0]) pm.collectionVariables.set("variantId", p.variants[0]._id);',
        '}',
      ]),
    }),
    req('Update Product (Admin)', 'PUT', '{{baseUrl}}/products/{{productId}}', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({ isFeatured: true, shortDesc: 'Updated short description' }),
      description: outcomeDesc([
        '✅ 200 — Updated',
        '❌ 400 — Invalid id / validation',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
    req('Delete Product Soft (Admin)', 'DELETE', '{{baseUrl}}/products/{{productId}}', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — Deactivated',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('5. Cart', [
    req('Get Cart', 'GET', '{{baseUrl}}/cart', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Cart + pricing (items may be empty)',
        '❌ 401 — Authentication required',
      ]),
    }),
    req('Add to Cart', 'POST', '{{baseUrl}}/cart/add', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        productId: '{{productId}}',
        variantId: '{{variantId}}',
        quantity: 1,
      }),
      description: outcomeDesc([
        '✅ 201 — Added / qty increased',
        '❌ 400 — Invalid variant / insufficient stock',
        '❌ 401 — Auth required',
        '❌ 404 — Product not found',
      ]),
      event: testEvent([
        'if (code === 201 || code === 200) {',
        '  const items = json.data.items || [];',
        '  if (items[0]) pm.collectionVariables.set("cartItemId", items[0]._id);',
        '  pm.test("SUCCESS: pricing present", function () {',
        '    pm.expect(json.data.pricing).to.include.keys("subtotal","discount","shippingCost","total");',
        '  });',
        '}',
      ]),
    }),
    req('Update Cart Item', 'PUT', '{{baseUrl}}/cart/update', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ itemId: '{{cartItemId}}', quantity: 2 }),
      description: outcomeDesc([
        '✅ 200 — Updated',
        '❌ 400 — Stock / unavailable',
        '❌ 401 — Auth required',
        '❌ 404 — Item not found',
      ]),
    }),
    req('Apply Coupon', 'POST', '{{baseUrl}}/cart/apply-coupon', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ code: '{{couponCode}}' }),
      description: outcomeDesc([
        '✅ 200 — Applied',
        '❌ 400 — Invalid/expired/min order/not applicable/already used/empty cart',
        '❌ 401 — Auth required',
      ]),
    }),
    req('Remove Coupon', 'DELETE', '{{baseUrl}}/cart/remove-coupon', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Removed',
        '❌ 401 — Auth required',
      ]),
    }),
    req('Remove Cart Item', 'DELETE', '{{baseUrl}}/cart/remove', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ itemId: '{{cartItemId}}' }),
      description: outcomeDesc([
        '✅ 200 — Removed',
        '❌ 401 — Auth required',
        '❌ 404 — Item not found',
      ]),
    }),
  ]),

  folder('6. Coupons', [
    req('Validate Coupon', 'POST', '{{baseUrl}}/coupons/validate', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ code: '{{couponCode}}' }),
      description: outcomeDesc([
        '✅ 200 — Valid + discountAmount',
        '❌ 400 — Invalid/expired/limits/empty cart',
        '❌ 401 — Auth required',
      ]),
    }),
    req('List Coupons (Admin)', 'GET', '{{baseUrl}}/coupons', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — All coupons',
        '❌ 401/403 — Auth / not admin',
      ]),
    }),
    req('Create Coupon (Admin)', 'POST', '{{baseUrl}}/coupons', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({
        code: 'SAVE50',
        description: 'Flat ₹50 off',
        discountType: 'flat',
        discountValue: 50,
        minOrderValue: 300,
        expiresAt: '2027-12-31T23:59:59.000Z',
        usageLimit: 100,
        usageLimitPerUser: 2,
      }),
      description: outcomeDesc([
        '✅ 201 — Created',
        '❌ 400 — Validation failed',
        '❌ 401/403 — Auth / not admin',
        '❌ 409 — Code exists',
      ]),
      event: testEvent([
        'if (code === 201) {',
        '  pm.collectionVariables.set("couponId", json.data.coupon._id);',
        '  pm.collectionVariables.set("couponCode", json.data.coupon.code);',
        '}',
      ]),
    }),
    req('Update Coupon (Admin)', 'PUT', '{{baseUrl}}/coupons/{{couponId}}', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({ description: 'Updated coupon' }),
      description: outcomeDesc([
        '✅ 200 — Updated',
        '❌ 400/404 — Validation / not found',
        '❌ 401/403 — Auth / not admin',
      ]),
    }),
    req('Delete Coupon Soft (Admin)', 'DELETE', '{{baseUrl}}/coupons/{{couponId}}', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — Deactivated',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('7. Orders', [
    req('Create Order (COD)', 'POST', '{{baseUrl}}/orders', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        paymentMethod: 'cod',
        shippingAddress: {
          fullName: 'Postman User',
          phone: '9876543210',
          line1: '12 MG Road',
          city: 'Bengaluru',
          state: 'KA',
          pincode: '560001',
        },
      }),
      description: outcomeDesc([
        '✅ 201 — Created (or 200 duplicate pending within 2 min)',
        '❌ 400 — Empty cart / stock / COD disabled / validation',
        '❌ 401 — Auth required',
        'Prerequisite: Add to Cart first',
      ]),
      event: testEvent([
        'if (code === 201 || code === 200) {',
        '  pm.test("SUCCESS: orderId", function () {',
        '    pm.expect(json.data.order.orderId).to.match(/^ORD-/);',
        '  });',
        '  pm.collectionVariables.set("orderId", json.data.order.orderId);',
        '}',
      ]),
    }),
    req('Create Order (Razorpay)', 'POST', '{{baseUrl}}/orders', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        paymentMethod: 'razorpay',
        shippingAddress: {
          fullName: 'Postman User',
          phone: '9876543210',
          line1: '12 MG Road',
          city: 'Bengaluru',
          state: 'KA',
          pincode: '560001',
        },
      }),
      description: outcomeDesc([
        '✅ 201 — Pending payment order',
        '❌ 400 — Empty cart / stock / validation',
        '❌ 401 — Auth required',
        'Next: Payments → Create Razorpay Order',
      ]),
      event: testEvent([
        'if (code === 201 || code === 200) pm.collectionVariables.set("orderId", json.data.order.orderId);',
      ]),
    }),
    req('My Orders', 'GET', '{{baseUrl}}/orders/my', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — { orders, pagination }',
        '❌ 401 — Auth required',
      ]),
    }),
    req('Get Order', 'GET', '{{baseUrl}}/orders/{{orderId}}', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Order detail',
        '❌ 401 — Auth required',
        '❌ 403 — Not your order',
        '❌ 404 — Not found',
      ]),
    }),
    req(
      'List Orders (Admin)',
      'GET',
      {
        raw: '{{baseUrl}}/orders?page=1&limit=20',
        host: ['{{baseUrl}}'],
        path: ['orders'],
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
          { key: 'orderStatus', value: 'pending', disabled: true },
          { key: 'paymentStatus', value: 'paid', disabled: true },
        ],
      },
      {
        auth: 'admin',
        description: outcomeDesc([
          '✅ 200 — All orders',
          '❌ 401/403 — Auth / not admin',
        ]),
      }
    ),
    req('Update Order Status (Admin)', 'PUT', '{{baseUrl}}/orders/{{orderId}}/status', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({
        orderStatus: 'shipped',
        trackingNumber: 'TRK123456',
        logisticsPartner: 'Delhivery',
        message: 'Out for shipping',
      }),
      description: outcomeDesc([
        '✅ 200 — Updated + timeline',
        '❌ 400 — Validation failed',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
    req('Cancel Order', 'POST', '{{baseUrl}}/orders/{{orderId}}/cancel', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ cancelReason: 'Changed my mind' }),
      description: outcomeDesc([
        '✅ 200 — Cancelled (or refund_initiated if paid)',
        '❌ 400 — Can no longer cancel',
        '❌ 401/403 — Auth / not owner',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('8. Payments', [
    req('Create Razorpay Order', 'POST', '{{baseUrl}}/payments/create-order', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ orderId: '{{orderId}}' }),
      description: outcomeDesc([
        '✅ 200 — keyId + razorpayOrderId + amount',
        '❌ 400 — Not razorpay / already paid / cancelled',
        '❌ 401 — Auth required',
        '❌ 404 — Order not found',
        '❌ 503 — Razorpay not configured',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: razorpayOrderId", function () {',
        '    pm.expect(json.data.razorpayOrderId).to.be.a("string");',
        '  });',
        '}',
      ]),
    }),
    req('Verify Payment', 'POST', '{{baseUrl}}/payments/verify', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        orderId: '{{orderId}}',
        razorpayOrderId: 'order_xxx',
        razorpayPaymentId: 'pay_xxx',
        razorpaySignature: 'signature_from_razorpay',
      }),
      description: outcomeDesc([
        '✅ 200 — Verified; payment_confirmed',
        '❌ 400 — Bad signature / mismatch',
        '❌ 401 — Auth required',
        '❌ 503 — Razorpay not configured',
      ]),
    }),
    req('Webhook (Razorpay)', 'POST', '{{baseUrl}}/payments/webhook', {
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'x-razorpay-signature', value: 'PASTE_SIGNATURE' },
      ],
      body: raw({
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_xxx', order_id: 'order_xxx' } },
        },
      }),
      description: outcomeDesc([
        '✅ 200 — Processed',
        '❌ 400 — Missing/invalid signature',
        '❌ 503 — Webhook secret missing',
      ]),
    }),
  ]),

  folder('9. Wishlist', [
    req('Get Wishlist', 'GET', '{{baseUrl}}/wishlist', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — products array',
        '❌ 401 — Auth required',
      ]),
    }),
    req('Add to Wishlist', 'POST', '{{baseUrl}}/wishlist/add', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ productId: '{{productId}}' }),
      description: outcomeDesc([
        '✅ 201 — Added',
        '❌ 401 — Auth required',
        '❌ 404 — Product not found',
      ]),
    }),
    req('Move Wishlist Item to Cart', 'POST', '{{baseUrl}}/wishlist/move-to-cart', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        productId: '{{productId}}',
        variantId: '{{variantId}}',
        quantity: 1,
      }),
      description: outcomeDesc([
        '✅ 200 — Moved to cart',
        '❌ 400 — Not in wishlist / variant / stock',
        '❌ 401 — Auth required',
        '❌ 404 — Product not found',
      ]),
    }),
    req('Remove from Wishlist', 'DELETE', '{{baseUrl}}/wishlist/remove/{{productId}}', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Removed',
        '❌ 401 — Auth required',
      ]),
    }),
  ]),

  folder('10. Reviews', [
    req('Create Review', 'POST', '{{baseUrl}}/reviews', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        productId: '{{productId}}',
        orderId: '{{orderId}}',
        rating: 5,
        title: 'Great product',
        comment: 'Excellent print quality and finish.',
      }),
      description: outcomeDesc([
        '✅ 201 — Created; rating recalculated',
        '❌ 400 — Order not eligible / validation',
        '❌ 401 — Auth required',
        '❌ 403 — Product not purchased',
        '❌ 404 — Product/order not found',
        '❌ 409 — Already reviewed',
      ]),
      event: testEvent([
        'if (code === 201) pm.collectionVariables.set("reviewId", json.data.review._id);',
      ]),
    }),
    req(
      'List Product Reviews',
      'GET',
      {
        raw: '{{baseUrl}}/reviews/product/{{productId}}?sort=newest&page=1&limit=10',
        host: ['{{baseUrl}}'],
        path: ['reviews', 'product', '{{productId}}'],
        query: [
          { key: 'sort', value: 'newest' },
          { key: 'page', value: '1' },
          { key: 'limit', value: '10' },
        ],
      },
      {
        description: outcomeDesc([
          '✅ 200 — reviews + pagination',
          '❌ 400 — Invalid query',
        ]),
      }
    ),
    req('Update Review', 'PUT', '{{baseUrl}}/reviews/{{reviewId}}', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ comment: 'Updated review comment' }),
      description: outcomeDesc([
        '✅ 200 — Updated',
        '❌ 401 — Auth required',
        '❌ 403 — Not your review',
        '❌ 404 — Not found/hidden',
      ]),
    }),
    req('Mark Review Helpful', 'POST', '{{baseUrl}}/reviews/{{reviewId}}/helpful', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — Vote counted',
        '❌ 400 — Already voted',
        '❌ 401 — Auth required',
        '❌ 404 — Not found',
      ]),
    }),
    req('Hide Review (Admin)', 'DELETE', '{{baseUrl}}/reviews/{{reviewId}}', {
      auth: 'admin',
      description: outcomeDesc([
        '✅ 200 — Hidden',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('11. Notifications', [
    req(
      'List Notifications',
      'GET',
      {
        raw: '{{baseUrl}}/notifications?page=1&limit=20',
        host: ['{{baseUrl}}'],
        path: ['notifications'],
        query: [
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' },
          { key: 'isRead', value: 'false', disabled: true },
        ],
      },
      {
        auth: 'user',
        description: outcomeDesc([
          '✅ 200 — notifications + unreadCount',
          '❌ 401 — Auth required',
        ]),
        event: testEvent([
          'if (code === 200 && json.data.notifications[0]) {',
          '  pm.collectionVariables.set("notificationId", json.data.notifications[0]._id);',
          '}',
        ]),
      }
    ),
    req('Mark Notification Read', 'PUT', '{{baseUrl}}/notifications/{{notificationId}}/read', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Marked read',
        '❌ 401 — Auth required',
        '❌ 404 — Not found',
      ]),
    }),
    req('Mark All Read', 'PUT', '{{baseUrl}}/notifications/read-all', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — All marked read',
        '❌ 401 — Auth required',
      ]),
    }),
    req('Delete Notification', 'DELETE', '{{baseUrl}}/notifications/{{notificationId}}', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Deleted',
        '❌ 401 — Auth required',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('12. Custom Orders', [
    req('Create Custom Order', 'POST', '{{baseUrl}}/custom-orders', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({
        description:
          'Custom anime figurine stand with engraved nameplate, about 15cm tall.',
        preferredMaterial: 'Resin',
        preferredColor: 'Matte Black',
        quantity: 1,
        dimensions: { length: 10, width: 10, height: 15, unit: 'cm' },
        budgetRange: { min: 800, max: 1500 },
        preferredContact: 'email',
        additionalNotes: 'Please include felt pads on base.',
      }),
      description: outcomeDesc([
        '✅ 201 — COR-YYYY-##### created',
        '❌ 400 — Validation (description min 10 chars)',
        '❌ 401 — Auth required',
      ]),
      event: testEvent([
        'if (code === 201) {',
        '  pm.test("SUCCESS: requestId", function () {',
        '    pm.expect(json.data.request.requestId).to.match(/^COR-/);',
        '  });',
        '  pm.collectionVariables.set("customOrderId", json.data.request.requestId);',
        '}',
      ]),
    }),
    req('List Custom Orders', 'GET', '{{baseUrl}}/custom-orders?page=1&limit=20', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Own list (admin sees all)',
        '❌ 401 — Auth required',
      ]),
    }),
    req('Get Custom Order', 'GET', '{{baseUrl}}/custom-orders/{{customOrderId}}', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Full request',
        '❌ 401/403 — Auth / not owner',
        '❌ 404 — Not found',
      ]),
    }),
    req('Quote Custom Order (Admin)', 'PUT', '{{baseUrl}}/custom-orders/{{customOrderId}}/status', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({
        status: 'quoted',
        quote: {
          amount: 1200,
          estimatedDays: 7,
          adminNote: 'Includes paint and packaging',
        },
        note: 'Quote sent',
      }),
      description: outcomeDesc([
        '✅ 200 — Quoted + notification',
        '❌ 400 — Quote required for status=quoted',
        '❌ 401/403 — Auth / not admin',
        '❌ 404 — Not found',
      ]),
    }),
    req('Accept Quote', 'PUT', '{{baseUrl}}/custom-orders/{{customOrderId}}/accept-quote', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — Accepted; creates pending order',
        '❌ 400 — No active quote',
        '❌ 401/403 — Auth / not owner',
        '❌ 404 — Not found',
      ]),
      event: testEvent([
        'if (code === 200 && json.data.order) pm.collectionVariables.set("orderId", json.data.order.orderId);',
      ]),
    }),
    req('Reject Quote', 'PUT', '{{baseUrl}}/custom-orders/{{customOrderId}}/reject-quote', {
      auth: 'user',
      headers: jsonHeaders(),
      body: raw({ note: 'Budget too high' }),
      description: outcomeDesc([
        '✅ 200 — Rejected',
        '❌ 400 — No active quote',
        '❌ 401/403 — Auth / not owner',
        '❌ 404 — Not found',
      ]),
    }),
  ]),

  folder('13. Uploads (Cloudinary)', [
    req('Upload Status', 'GET', '{{baseUrl}}/uploads/status', {
      auth: 'user',
      description: outcomeDesc([
        '✅ 200 — configured + folders + limits',
        '❌ 401 — Auth required',
      ]),
      event: testEvent([
        'if (code === 200) {',
        '  pm.test("SUCCESS: configured boolean", function () {',
        '    pm.expect(json.data.configured).to.be.a("boolean");',
        '  });',
        '}',
      ]),
    }),
    {
      name: 'Upload Single Image',
      event: [
        testEvent([
          'if (code === 201) {',
          '  pm.test("SUCCESS: url + publicId", function () {',
          '    pm.expect(json.data.file.url).to.be.a("string");',
          '    pm.expect(json.data.file.publicId).to.be.a("string");',
          '  });',
          '  pm.collectionVariables.set("uploadPublicId", json.data.file.publicId);',
          '  pm.collectionVariables.set("uploadUrl", json.data.file.url);',
          '}',
        ]),
      ],
      request: {
        method: 'POST',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        body: {
          mode: 'formdata',
          formdata: [
            {
              key: 'file',
              type: 'file',
              src: [],
              description: 'JPEG/PNG/WebP/GIF max 10MB',
            },
            {
              key: 'folder',
              type: 'text',
              value: 'products',
              description:
                'products | categories | custom-orders | reviews | general',
            },
          ],
        },
        url: '{{baseUrl}}/uploads/image',
        description: outcomeDesc([
          '✅ 201 — file.url + publicId',
          '❌ 400 — No file / bad type / too large',
          '❌ 401 — Auth required',
          '❌ 503 — Cloudinary not configured',
        ]),
      },
    },
    {
      name: 'Upload Multiple Images',
      event: [testEvent()],
      request: {
        method: 'POST',
        header: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        body: {
          mode: 'formdata',
          formdata: [
            {
              key: 'files',
              type: 'file',
              src: [],
              description: 'Up to 5 images',
            },
            { key: 'folder', type: 'text', value: 'custom-orders' },
          ],
        },
        url: '{{baseUrl}}/uploads/images',
        description: outcomeDesc([
          '✅ 201 — files[] + urls[]',
          '❌ 400 — No files / too many / size/mime',
          '❌ 401 — Auth required',
          '❌ 503 — Cloudinary not configured',
        ]),
      },
    },
    req('Delete Upload (Admin)', 'DELETE', '{{baseUrl}}/uploads', {
      auth: 'admin',
      headers: jsonHeaders(),
      body: raw({ publicId: '{{uploadPublicId}}' }),
      description: outcomeDesc([
        '✅ 200 — Deleted',
        '❌ 400 — Missing publicId / delete failed',
        '❌ 401/403 — Auth / not admin',
        '❌ 503 — Cloudinary not configured',
      ]),
    }),
  ]),
];

const out = path.join(
  __dirname,
  '..',
  'postman',
  '3D_Forge_API.postman_collection.json'
);
fs.writeFileSync(out, JSON.stringify(collection, null, 2));
console.log('Updated', out);
console.log('baseUrl =', collection.variable.find((v) => v.key === 'baseUrl').value);
console.log('folders =', collection.item.length);
