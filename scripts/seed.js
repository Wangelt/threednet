const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');

async function seed() {
  await connectDB();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@3dforge.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Platform Admin',
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'admin',
      isEmailVerified: true,
    });
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  let category = await Category.findOne({ slug: 'home-decor' });
  if (!category) {
    category = await Category.create({
      name: 'Home Décor',
      slug: 'home-decor',
      description: 'Decorative 3D printed pieces for living spaces',
      sortOrder: 1,
    });
  }

  const existingProduct = await Product.findOne({ slug: 'geometric-desk-organizer' });
  if (!existingProduct) {
    await Product.create({
      title: 'Geometric Desk Organizer',
      slug: 'geometric-desk-organizer',
      description:
        'Engineer-designed modular desk organizer printed in durable PLA. Holds pens, cards, and small gadgets.',
      shortDesc: 'Modular PLA desk organizer with clean geometry.',
      category: category._id,
      tags: ['desk', 'organizer', 'office', 'pla'],
      images: ['https://placehold.co/800x800/png?text=Desk+Organizer'],
      variants: [
        {
          label: 'Medium - Matte Black - PLA',
          material: 'PLA',
          color: 'Matte Black',
          size: '20x12x10 cm',
          price: 999,
          stock: 25,
          sku: 'GDO-MB-PLA-M',
        },
        {
          label: 'Medium - White - PLA',
          material: 'PLA',
          color: 'White',
          size: '20x12x10 cm',
          price: 999,
          stock: 18,
          sku: 'GDO-WH-PLA-M',
        },
      ],
      dimensions: { length: 20, width: 12, height: 10, unit: 'cm', weight: 180 },
      printTime: '6-8 hours',
      isFeatured: true,
    });
    console.log('Sample product created');
  }

  const existingCoupon = await Coupon.findOne({ code: 'LAUNCH20' });
  if (!existingCoupon) {
    await Coupon.create({
      code: 'LAUNCH20',
      description: 'Launch offer — 20% off up to ₹200',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscount: 200,
      minOrderValue: 500,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      usageLimit: 1000,
      usageLimitPerUser: 3,
      applicableTo: { type: 'all', categories: [], products: [] },
    });
    console.log('Sample coupon LAUNCH20 created');
  }

  console.log('Seed complete');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
