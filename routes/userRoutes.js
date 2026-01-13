const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    addAddress,
    getUsers,
    deleteUser
} = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateUserProfile);
router.post('/address', auth, addAddress);

// Favorites
router.get('/favorites', auth, require('../controllers/userController').getFavorites);
router.post('/favorites/:productId', auth, require('../controllers/userController').toggleFavorite);

// Cart Persistence
router.get('/cart', auth, require('../controllers/userController').getCart);
router.post('/cart', auth, require('../controllers/userController').updateCart);

// Admin Routes
router.get('/', auth, getUsers);
router.delete('/:id', auth, deleteUser);

module.exports = router;
