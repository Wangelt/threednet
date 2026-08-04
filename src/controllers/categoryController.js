const slugify = require('slugify');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function makeSlug(name, slug) {
  return (
    slug ||
    slugify(name, { lower: true, strict: true, trim: true })
  );
}

const listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin' || req.user?.role === 'super_admin';
  const showAll = includeInactive && (req.query.all === 'true' || req.query.all === '1');
  const filter = showAll ? {} : { isActive: true };

  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: { categories } });
});

const createCategory = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    slug: makeSlug(req.body.name, req.body.slug),
  };

  const category = await Category.create(payload);
  res.status(201).json({ success: true, data: { category } });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  if (req.body.name && !req.body.slug) {
    req.body.slug = makeSlug(req.body.name);
  }

  Object.assign(category, req.body);
  await category.save();

  res.json({ success: true, data: { category } });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  category.isActive = false;
  await category.save();

  res.json({ success: true, message: 'Category deactivated' });
});

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
