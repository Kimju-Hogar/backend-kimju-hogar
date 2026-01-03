const express = require('express');
const router = express.Router();
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoryController');
const auth = require('../middleware/authMiddleware');

router.get('/', getCategories);
router.post('/', auth, createCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
