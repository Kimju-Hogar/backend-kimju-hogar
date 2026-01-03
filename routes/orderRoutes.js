const express = require('express');
const router = express.Router();
const { addOrderItems, getOrderById, getMyOrders, getOrders } = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, addOrderItems);
router.get('/myorders', auth, getMyOrders);
router.get('/', auth, getOrders); // New Admin Route
router.get('/:id', auth, getOrderById);

module.exports = router;
