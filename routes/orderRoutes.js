const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    getOrderById,
    getMyOrders,
    getOrders,
    updateOrderToPaid,
    updateOrderStatus
} = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, addOrderItems);
router.get('/myorders', auth, getMyOrders);
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrderById);
router.put('/:id/pay', auth, updateOrderToPaid);
router.put('/:id/status', auth, updateOrderStatus);

module.exports = router;
