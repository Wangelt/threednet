const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const Location = require('../src/models/Location');
const Inventory = require('../src/models/Inventory');
const Order = require('../src/models/Order');
const { recomputeVariantTotal } = require('../src/services/inventoryService');

const productImageMap = {
  'custom-3d-printed-phone-case': 'https://images.unsplash.com/photo-1636440591454-802dcc2a5b17?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  '3d-printed-desk-organizer': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
  '3d-printed-wall-clock': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
  '3d-printed-name-sign': 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
  '3d-printed-pen-holder': 'https://images.unsplash.com/photo-1550064824-2f1a5fdab7d4?w=800&q=80',
  '3d-printed-cable-box': 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80',
  '3d-printed-plant-pot': 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
  '3d-printed-coaster-set': 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
  '3d-printed-key-holder': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  '3d-printed-lamp-shade': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
  '3d-printed-mini-figurine': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
  '3d-printed-bookend-pair': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
  '3d-printed-car-dashboard-tray': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  '3d-printed-camera-grip': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
  '3d-printed-gaming-controller-stand': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  '3d-printed-dog-bowl-stand': 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80',
  '3d-printed-modular-storage-tray': 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
  '3d-printed-cat-scratcher': 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80',
  '3d-printed-jewelry-organizer': 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=80',
  '3d-printed-wall-shelf': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80',
};

const seedProducts = [
  {
    title: 'Custom 3D Printed Phone Case',
    slug: 'custom-3d-printed-phone-case',
    description: 'A durable custom 3D printed phone case designed for grip, impact protection, and a personalized fit for everyday use.',
    shortDesc: 'Protective custom phone case made with 3D printing.',
    tags: ['3d printed', 'phone case', 'custom', 'accessory', 'tech'],
    images: [productImageMap['custom-3d-printed-phone-case']],
    variants: [{ label: 'iPhone 15 Pro - Matte Black', material: 'PLA+', color: 'Matte Black', size: '160x78x10 mm', price: 1299, stock: 35, sku: 'CASE-IP15-BLK' }],
    dimensions: { length: 16, width: 7.8, height: 1, unit: 'cm', weight: 42 },
    printTime: '3-4 hours',
    isFeatured: true,
  },
  {
    title: '3D Printed Desk Organizer',
    slug: '3d-printed-desk-organizer',
    description: 'A custom 3D printed organizer created to keep pens, clips, cables, and office tools neatly arranged on your desk.',
    shortDesc: 'Modular organizer for a clean, printed workspace.',
    tags: ['3d printed', 'desk', 'organizer', 'office', 'custom'],
    images: [productImageMap['3d-printed-desk-organizer']],
    variants: [{ label: 'Medium - Black', material: 'PLA', color: 'Black', size: '20x12x10 cm', price: 999, stock: 25, sku: 'ORG-BLK-M' }],
    dimensions: { length: 20, width: 12, height: 10, unit: 'cm', weight: 180 },
    printTime: '6-8 hours',
  },
  {
    title: '3D Printed Wall Clock',
    slug: '3d-printed-wall-clock',
    description: 'A modern 3D printed wall clock with layered geometry and a clean, precision-fit mechanism for contemporary interiors.',
    shortDesc: 'Geometric wall clock made with 3D printing.',
    tags: ['3d printed', 'clock', 'wall', 'decor', 'modern'],
    images: [productImageMap['3d-printed-wall-clock']],
    variants: [{ label: '30 cm - White', material: 'PLA', color: 'White', size: '30 cm diameter', price: 1699, stock: 18, sku: 'CLOCK-WH-30' }],
    dimensions: { length: 30, width: 30, height: 4, unit: 'cm', weight: 420 },
    printTime: '8-10 hours',
  },
  {
    title: '3D Printed Name Sign',
    slug: '3d-printed-name-sign',
    description: 'A personalized 3D printed name sign for desks, entryways, studios, and workspaces with a premium tabletop or wall finish.',
    shortDesc: 'Custom name sign with a clean 3D printed finish.',
    tags: ['3d printed', 'name sign', 'custom', 'home office', 'gift'],
    images: [productImageMap['3d-printed-name-sign']],
    variants: [{ label: '12 cm - White', material: 'PLA', color: 'White', size: '12x4x1 cm', price: 699, stock: 32, sku: 'SIGN-WH-12' }],
    dimensions: { length: 12, width: 4, height: 1, unit: 'cm', weight: 80 },
    printTime: '2-3 hours',
  },
  {
    title: '3D Printed Pen Holder',
    slug: '3d-printed-pen-holder',
    description: 'A compact 3D printed pen holder with modular pockets for pens, markers, and small tools used in studios and offices.',
    shortDesc: 'Printed pen holder for organized desks.',
    tags: ['3d printed', 'pen holder', 'desk', 'office', 'utility'],
    images: [productImageMap['3d-printed-pen-holder']],
    variants: [{ label: 'Standard - Grey', material: 'PLA', color: 'Grey', size: '10x10x8 cm', price: 449, stock: 42, sku: 'PEN-HOLDER-GR' }],
    dimensions: { length: 10, width: 10, height: 8, unit: 'cm', weight: 90 },
    printTime: '3-4 hours',
  },
  {
    title: '3D Printed Cable Box',
    slug: '3d-printed-cable-box',
    description: 'A custom 3D printed cable management box that keeps adapters, chargers, and wires hidden while preserving a neat work surface.',
    shortDesc: 'Printed cable organizer for clean desks.',
    tags: ['3d printed', 'cable', 'desk', 'organizer', 'tech'],
    images: [productImageMap['3d-printed-cable-box']],
    variants: [{ label: 'Large - Black', material: 'ABS', color: 'Black', size: '26x18x12 cm', price: 799, stock: 30, sku: 'CABLE-BOX-BK-L' }],
    dimensions: { length: 26, width: 18, height: 12, unit: 'cm', weight: 520 },
    printTime: '6-7 hours',
  },
  {
    title: '3D Printed Plant Pot',
    slug: '3d-printed-plant-pot',
    description: 'A lightweight 3D printed plant pot with a modern profile and drainage-friendly geometry for indoor greenery.',
    shortDesc: 'Modern 3D printed planter for indoor plants.',
    tags: ['3d printed', 'plant pot', 'home', 'botanical', 'decor'],
    images: [productImageMap['3d-printed-plant-pot']],
    variants: [{ label: 'Medium - Terracotta', material: 'PLA', color: 'Terracotta', size: '14x14x12 cm', price: 799, stock: 22, sku: 'POT-TRC-M' }],
    dimensions: { length: 14, width: 14, height: 12, unit: 'cm', weight: 240 },
    printTime: '5-6 hours',
  },
  {
    title: '3D Printed Coaster Set',
    slug: '3d-printed-coaster-set',
    description: 'A set of 3D printed coasters with textured surfaces, designed for stylish and practical daily use on tables and desks.',
    shortDesc: 'Printed coaster set with a modern finish.',
    tags: ['3d printed', 'coaster', 'home', 'kitchen', 'tableware'],
    images: [productImageMap['3d-printed-coaster-set']],
    variants: [{ label: 'Set of 4 - Sand', material: 'PLA', color: 'Sand', size: '30x22x6 cm', price: 1099, stock: 21, sku: 'COASTER-SET-SD-4' }],
    dimensions: { length: 30, width: 22, height: 6, unit: 'cm', weight: 410 },
    printTime: '5-7 hours',
  },
  {
    title: '3D Printed Key Holder',
    slug: '3d-printed-key-holder',
    description: 'A functional 3D printed key holder with hooks and a clean wall-mount profile for homes, offices, and entryways.',
    shortDesc: 'Functional wall key holder in 3D print format.',
    tags: ['3d printed', 'key holder', 'entryway', 'utility', 'home'],
    images: [productImageMap['3d-printed-key-holder']],
    variants: [{ label: 'Small - Walnut', material: 'PLA', color: 'Walnut', size: '28x8x5 cm', price: 799, stock: 22, sku: 'KEY-HOLDER-WN-S' }],
    dimensions: { length: 28, width: 8, height: 5, unit: 'cm', weight: 230 },
    printTime: '4-5 hours',
  },
  {
    title: '3D Printed Lamp Shade',
    slug: '3d-printed-lamp-shade',
    description: 'A custom 3D printed lamp shade that diffuses light softly while adding a sleek geometric statement to a room.',
    shortDesc: 'Printed lamp shade with a modern profile.',
    tags: ['3d printed', 'lamp', 'lighting', 'decor', 'home'],
    images: [productImageMap['3d-printed-lamp-shade']],
    variants: [{ label: 'Medium - Cream', material: 'PLA', color: 'Cream', size: '24x24x18 cm', price: 1599, stock: 14, sku: 'LAMP-SHADE-CR-M' }],
    dimensions: { length: 24, width: 24, height: 18, unit: 'cm', weight: 500 },
    printTime: '8-9 hours',
  },
  {
    title: '3D Printed Mini Figurine',
    slug: '3d-printed-mini-figurine',
    description: 'A custom 3D printed collectible figurine with fine detail and a smooth finish for collectors, gifts, and display shelves.',
    shortDesc: 'Detailed 3D printed collectible figurine.',
    tags: ['3d printed', 'figurine', 'collectible', 'gift', 'art'],
    images: [productImageMap['3d-printed-mini-figurine']],
    variants: [{ label: 'Small - White', material: 'PLA', color: 'White', size: '12x8x18 cm', price: 1499, stock: 12, sku: 'FIG-WH-S' }],
    dimensions: { length: 12, width: 8, height: 18, unit: 'cm', weight: 180 },
    printTime: '6-8 hours',
  },
  {
    title: '3D Printed Bookend Pair',
    slug: '3d-printed-bookend-pair',
    description: 'A sturdy 3D printed bookend pair designed to hold novels, references, and desk books securely without wobble.',
    shortDesc: 'Strong printed bookends for shelves and desks.',
    tags: ['3d printed', 'bookend', 'study', 'desk', 'storage'],
    images: [productImageMap['3d-printed-bookend-pair']],
    variants: [{ label: 'Pair - Grey', material: 'PETG', color: 'Grey', size: '16x10x12 cm', price: 1299, stock: 24, sku: 'BOOKEND-GR-PAIR' }],
    dimensions: { length: 16, width: 10, height: 12, unit: 'cm', weight: 430 },
    printTime: '7-9 hours',
  },
  {
    title: '3D Printed Car Dashboard Tray',
    slug: '3d-printed-car-dashboard-tray',
    description: 'A custom 3D printed dashboard tray for phone storage, keys, and small travel essentials while driving.',
    shortDesc: 'Printed car accessory for dashboard organization.',
    tags: ['3d printed', 'car', 'dashboard', 'utility', 'travel'],
    images: [productImageMap['3d-printed-car-dashboard-tray']],
    variants: [{ label: 'Universal - Black', material: 'ABS', color: 'Black', size: '28x12x6 cm', price: 1599, stock: 16, sku: 'CAR-TRAY-BK-UNI' }],
    dimensions: { length: 28, width: 12, height: 6, unit: 'cm', weight: 280 },
    printTime: '5-6 hours',
  },
  {
    title: '3D Printed Camera Grip',
    slug: '3d-printed-camera-grip',
    description: 'A precision 3D printed camera grip for ergonomic hand support, accessory mounting, and stable shooting comfort.',
    shortDesc: 'Ergonomic printed grip for cameras.',
    tags: ['3d printed', 'camera', 'photo', 'accessory', 'creator'],
    images: [productImageMap['3d-printed-camera-grip']],
    variants: [{ label: 'Canon/SONY Fit - Black', material: 'PETG', color: 'Black', size: '11x9x5 cm', price: 1799, stock: 15, sku: 'CAM-GRIP-BK' }],
    dimensions: { length: 11, width: 9, height: 5, unit: 'cm', weight: 150 },
    printTime: '4-5 hours',
  },
  {
    title: '3D Printed Gaming Controller Stand',
    slug: '3d-printed-gaming-controller-stand',
    description: 'A sleek 3D printed controller stand built for ergonomic play, display, and charging convenience.',
    shortDesc: 'Printed gaming stand for controllers.',
    tags: ['3d printed', 'gaming', 'controller', 'desk', 'accessory'],
    images: [productImageMap['3d-printed-gaming-controller-stand']],
    variants: [{ label: 'Dual Stand - Black', material: 'PLA', color: 'Black', size: '22x14x8 cm', price: 1299, stock: 20, sku: 'GAME-STAND-BK' }],
    dimensions: { length: 22, width: 14, height: 8, unit: 'cm', weight: 260 },
    printTime: '5-6 hours',
  },
  {
    title: '3D Printed Dog Bowl Stand',
    slug: '3d-printed-dog-bowl-stand',
    description: 'A practical 3D printed pet bowl stand that raises feeding height and keeps feeding areas cleaner and more comfortable.',
    shortDesc: 'Printed bowl stand for pets.',
    tags: ['3d printed', 'pet', 'dog', 'utility', 'home'],
    images: [productImageMap['3d-printed-dog-bowl-stand']],
    variants: [{ label: 'Standard - Grey', material: 'ABS', color: 'Grey', size: '35x26x12 cm', price: 2299, stock: 10, sku: 'DOG-BOWL-GR' }],
    dimensions: { length: 35, width: 26, height: 12, unit: 'cm', weight: 980 },
    printTime: '11-14 hours',
  },
  {
    title: '3D Printed Modular Storage Tray',
    slug: '3d-printed-modular-storage-tray',
    description: 'A stackable 3D printed storage tray designed for small supplies, maker tools, and tidy organization in creative spaces.',
    shortDesc: 'Modular printed tray for small-item storage.',
    tags: ['3d printed', 'storage', 'modular', 'organizer', 'maker'],
    images: [productImageMap['3d-printed-modular-storage-tray']],
    variants: [{ label: 'Set of 2 - Ivory', material: 'PLA', color: 'Ivory', size: '18x18x18 cm', price: 1299, stock: 17, sku: 'MOD-TRAY-IV-2' }],
    dimensions: { length: 18, width: 18, height: 18, unit: 'cm', weight: 460 },
    printTime: '7-8 hours',
  },
  {
    title: '3D Printed Cat Scratcher',
    slug: '3d-printed-cat-scratcher',
    description: 'A durable 3D printed cat scratcher with a textured surface to encourage healthy scratching and keep furniture protected.',
    shortDesc: 'Printed cat scratcher for active pets.',
    tags: ['3d printed', 'cat', 'pet', 'scratcher', 'home'],
    images: [productImageMap['3d-printed-cat-scratcher']],
    variants: [{ label: 'Base - Beige', material: 'PLA', color: 'Beige', size: '32x20x10 cm', price: 1199, stock: 14, sku: 'CAT-SCRATCH-BE' }],
    dimensions: { length: 32, width: 20, height: 10, unit: 'cm', weight: 500 },
    printTime: '7-9 hours',
  },
  {
    title: '3D Printed Jewelry Organizer',
    slug: '3d-printed-jewelry-organizer',
    description: 'A compact 3D printed jewelry organizer with slots and trays for rings, earrings, and bracelets in a clean custom layout.',
    shortDesc: 'Custom printed organizer for jewelry storage.',
    tags: ['3d printed', 'jewelry', 'organizer', 'gift', 'personal'],
    images: [productImageMap['3d-printed-jewelry-organizer']],
    variants: [{ label: 'Classic - Rose', material: 'PLA', color: 'Rose', size: '18x12x6 cm', price: 1099, stock: 19, sku: 'JEWEL-ORG-ROSE' }],
    dimensions: { length: 18, width: 12, height: 6, unit: 'cm', weight: 170 },
    printTime: '4-5 hours',
  },
  {
    title: '3D Printed Wall Shelf',
    slug: '3d-printed-wall-shelf',
    description: 'A slim 3D printed wall shelf for décor, books, or small tech essentials in a minimalist modern form.',
    shortDesc: 'Printed floating shelf for small spaces.',
    tags: ['3d printed', 'wall shelf', 'storage', 'decor', 'home'],
    images: [productImageMap['3d-printed-wall-shelf']],
    variants: [{ label: 'Single - Ash', material: 'PLA', color: 'Ash', size: '60x20x8 cm', price: 2499, stock: 9, sku: 'WALL-SHELF-ASH' }],
    dimensions: { length: 60, width: 20, height: 8, unit: 'cm', weight: 1100 },
    printTime: '12-14 hours',
  },
];

async function seed() {
  await connectDB();

  let mainLocation = await Location.findOne({ code: 'MAIN' });
  if (!mainLocation) {
    mainLocation = await Location.create({
      name: 'Main warehouse',
      code: 'MAIN',
      city: 'Primary',
      isActive: true,
    });
    console.log('Location MAIN created');
  } else {
    console.log('Location MAIN already exists');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@3dforge.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Platform Admin',
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'admin',
      location: mainLocation._id,
      isEmailVerified: true,
    });
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    if (!admin.location) {
      admin.location = mainLocation._id;
      await admin.save();
      console.log(`Admin assigned to MAIN: ${adminEmail}`);
    } else {
      console.log(`Admin already exists: ${adminEmail}`);
    }
  }

  const superEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@3dforge.local';
  const superPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SuperAdmin12345!';

  let superAdmin = await User.findOne({ email: superEmail });
  if (!superAdmin) {
    superAdmin = await User.create({
      name: 'Platform Super Admin',
      email: superEmail,
      passwordHash: superPassword,
      role: 'super_admin',
      isEmailVerified: true,
    });
    console.log(`Super admin created: ${superEmail} / ${superPassword}`);
  } else if (superAdmin.role !== 'super_admin') {
    superAdmin.role = 'super_admin';
    superAdmin.isEmailVerified = true;
    await superAdmin.save();
    console.log(`Promoted existing user to super_admin: ${superEmail}`);
  } else {
    console.log(`Super admin already exists: ${superEmail}`);
  }

  let category = await Category.findOne({ slug: 'home-decor' });
  if (!category) {
    category = await Category.create({
      name: 'Home Décor',
      slug: 'home-decor',
      description: 'Decorative 3D printed pieces for living spaces',
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80',
      sortOrder: 1,
    });
  } else if (!category.image) {
    category.image = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80';
    await category.save();
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const productData of seedProducts) {
    const existingProduct = await Product.findOne({ slug: productData.slug });
    const payload = {
      ...productData,
      category: category._id,
      tags: (productData.tags || []).map((tag) => String(tag).toLowerCase()),
    };

    if (!existingProduct) {
      await Product.create(payload);
      createdCount += 1;
    } else {
      existingProduct.set(payload);
      await existingProduct.save();
      updatedCount += 1;
    }
  }

  if (createdCount) {
    console.log(`Created ${createdCount} products`);
  }
  if (updatedCount) {
    console.log(`Updated ${updatedCount} existing products`);
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

  const adminsMissingLoc = await User.updateMany(
    { role: 'admin', $or: [{ location: null }, { location: { $exists: false } }] },
    { $set: { location: mainLocation._id } }
  );
  if (adminsMissingLoc.modifiedCount) {
    console.log(`Assigned MAIN to ${adminsMissingLoc.modifiedCount} admin(s)`);
  }

  const products = await Product.find();
  let inventoryUpserts = 0;
  for (const product of products) {
    for (const variant of product.variants || []) {
      const existing = await Inventory.findOne({
        variantId: variant._id,
        location: mainLocation._id,
      });
      if (!existing) {
        await Inventory.create({
          product: product._id,
          variantId: variant._id,
          location: mainLocation._id,
          stock: variant.stock || 0,
        });
        inventoryUpserts += 1;
      }
      await recomputeVariantTotal(product._id, variant._id);
    }
  }
  if (inventoryUpserts) {
    console.log(`Inventory rows created for MAIN: ${inventoryUpserts}`);
  }

  const orderBackfill = await Order.updateMany(
    { $or: [{ location: null }, { location: { $exists: false } }] },
    { $set: { location: mainLocation._id } }
  );
  if (orderBackfill.modifiedCount) {
    console.log(`Orders backfilled to MAIN: ${orderBackfill.modifiedCount}`);
  }

  console.log('Seed complete');
  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { seedProducts, seed };



