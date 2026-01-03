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

// Admin Routes
router.get('/', auth, getUsers);
router.delete('/:id', auth, deleteUser);

module.exports = router;
