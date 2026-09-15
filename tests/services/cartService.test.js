const {
  findVariant,
  computeShipping,
  buildCartSummary,
} = require('../../src/services/cartService');

// Mongoose DocumentArrays have an `.id()` method. This helper replicates it
// so we can test without connecting to MongoDB.
function makeVariantArray(variants) {
  const arr = variants.slice();
  arr.id = (id) => arr.find((v) => String(v._id) === String(id)) || null;
  return arr;
}

function makeProduct(variants = []) {
  return {
    _id: 'prod1',
    title: 'Widget',
    slug: 'widget',
    images: ['img.jpg'],
    isActive: true,
    variants: makeVariantArray(variants),
  };
}

// Default shipping config from env defaults: flatRate=49, freeAbove=999
describe('computeShipping', () => {
  test('returns 0 when subtotal meets the free-shipping threshold', () => {
    expect(computeShipping(999)).toBe(0);
  });

  test('returns 0 when subtotal exceeds the threshold', () => {
    expect(computeShipping(1500)).toBe(0);
  });

  test('returns the flat rate below the threshold', () => {
    expect(computeShipping(998)).toBe(49);
  });

  test('returns the flat rate for an empty cart (0)', () => {
    expect(computeShipping(0)).toBe(49);
  });
});

describe('findVariant', () => {
  const variant = { _id: 'var1', label: 'Small', price: 400, stock: 5 };

  test('finds a variant via the Mongoose .id() method', () => {
    const product = makeProduct([variant]);
    expect(findVariant(product, 'var1')).toMatchObject({ label: 'Small' });
  });

  test('falls back to string comparison when .id() returns null', () => {
    const product = makeProduct([variant]);
    // Override .id() to simulate Mongoose returning null (e.g. subdoc cast failure)
    product.variants.id = () => null;
    expect(findVariant(product, 'var1')).toMatchObject({ label: 'Small' });
  });

  test('returns falsy when the variant does not exist', () => {
    const product = makeProduct([variant]);
    expect(findVariant(product, 'nonexistent')).toBeFalsy();
  });

  test('returns null when the product has no variants', () => {
    expect(findVariant(makeProduct([]), 'var1')).toBeNull();
  });

  test('returns null for a null product', () => {
    expect(findVariant(null, 'var1')).toBeNull();
  });
});

describe('buildCartSummary', () => {
  function makeCart(items, couponApplied = null) {
    return { items, couponApplied };
  }

  function makeItem({ variantPrice, quantity, priceAtAdd, variantId = 'var1' } = {}) {
    const product = makeProduct([
      { _id: variantId, label: 'Default', price: variantPrice, stock: 20 },
    ]);
    return { product, variantId, quantity, priceAtAdd };
  }

  test('calculates subtotal as sum of (currentPrice × quantity)', () => {
    const cart = makeCart([makeItem({ variantPrice: 300, quantity: 2, priceAtAdd: 300 })]);
    const { pricing } = buildCartSummary(cart);
    expect(pricing.subtotal).toBe(600);
  });

  test('applies free shipping when subtotal meets the threshold', () => {
    const cart = makeCart([makeItem({ variantPrice: 500, quantity: 2, priceAtAdd: 500 })]);
    const { pricing } = buildCartSummary(cart);
    expect(pricing.subtotal).toBe(1000);
    expect(pricing.shippingCost).toBe(0);
    expect(pricing.total).toBe(1000);
  });

  test('adds flat-rate shipping when subtotal is below the threshold', () => {
    const cart = makeCart([makeItem({ variantPrice: 200, quantity: 1, priceAtAdd: 200 })]);
    const { pricing } = buildCartSummary(cart);
    expect(pricing.shippingCost).toBe(49);
    expect(pricing.total).toBe(249);
  });

  test('subtracts coupon discount before computing shipping', () => {
    // subtotal=500, discount=100, afterDiscount=400 (<999 → shipping=49)
    const cart = makeCart(
      [makeItem({ variantPrice: 500, quantity: 1, priceAtAdd: 500 })],
      { code: 'SAVE100', discountAmount: 100 }
    );
    const { pricing } = buildCartSummary(cart);
    expect(pricing.discount).toBe(100);
    expect(pricing.shippingCost).toBe(49);
    expect(pricing.total).toBe(449);
  });

  test('discount cannot push total below zero', () => {
    const cart = makeCart(
      [makeItem({ variantPrice: 50, quantity: 1, priceAtAdd: 50 })],
      { code: 'BIG', discountAmount: 9999 }
    );
    const { pricing } = buildCartSummary(cart);
    // afterDiscount clamped to 0, then flat shipping applies
    expect(pricing.total).toBe(49);
  });

  test('flags priceChanged when current variant price differs from priceAtAdd', () => {
    const cart = makeCart([makeItem({ variantPrice: 400, quantity: 1, priceAtAdd: 350 })]);
    const { items } = buildCartSummary(cart);
    expect(items[0].priceChanged).toBe(true);
    expect(items[0].currentPrice).toBe(400);
  });

  test('does not flag priceChanged when price is unchanged', () => {
    const cart = makeCart([makeItem({ variantPrice: 350, quantity: 1, priceAtAdd: 350 })]);
    const { items } = buildCartSummary(cart);
    expect(items[0].priceChanged).toBe(false);
  });

  test('returns null couponApplied when no coupon is set', () => {
    const cart = makeCart([makeItem({ variantPrice: 200, quantity: 1, priceAtAdd: 200 })]);
    expect(buildCartSummary(cart).couponApplied).toBeNull();
  });

  test('includes couponApplied in summary when a coupon is present', () => {
    const coupon = { code: 'SUMMER10', discountAmount: 30 };
    const cart = makeCart(
      [makeItem({ variantPrice: 200, quantity: 1, priceAtAdd: 200 })],
      coupon
    );
    expect(buildCartSummary(cart).couponApplied).toEqual(coupon);
  });
});
