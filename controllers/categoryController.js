const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        console.log("Request to create category:", name);

        if (!name) {
            return res.status(400).json({ message: 'El nombre de la categoría es obligatorio.' });
        }

        const slug = name.toLowerCase().split(' ').join('-');

        const category = new Category({ name, slug, description });
        await category.save();
        res.status(201).json(category);
    } catch (err) {
        console.error("Error creating category:", err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'La categoría ya existe.' });
        }
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
