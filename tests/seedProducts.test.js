const { seedProducts } = require('../scripts/seed');

describe('seed product catalog', () => {
  it('includes 20 product entries with valid fields', () => {
    expect(Array.isArray(seedProducts)).toBe(true);
    expect(seedProducts).toHaveLength(20);

    for (const product of seedProducts) {
      expect(product).toMatchObject({
        title: expect.any(String),
        slug: expect.any(String),
        description: expect.any(String),
        shortDesc: expect.any(String),
        tags: expect.any(Array),
        images: expect.any(Array),
        variants: expect.any(Array),
      });
      expect(product.variants.length).toBeGreaterThan(0);
      expect(product.variants[0]).toMatchObject({
        price: expect.any(Number),
        stock: expect.any(Number),
        sku: expect.any(String),
      });
    }
  });
});
