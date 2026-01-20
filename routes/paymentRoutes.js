const express = require('express');
const router = express.Router();
const { Preference, Payment } = require('mercadopago');
const { mercadopagoClient } = require('../config/mercadopago');
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create Mercado Pago preference
// @route   POST /api/payments/create_preference
// @access  Private
router.post('/create_preference', auth, async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log('--- NUEVA PREFERENCIA ---');
        console.log('Order ID:', orderId);

        if (!orderId) {
            return res.status(400).json({ msg: 'orderId is required' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            console.error('Pedido no encontrado:', orderId);
            return res.status(404).json({ msg: 'Order not found' });
        }

        // 1. Validate Stock BEFORE creating preference
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ msg: `Producto no encontrado: ${item.name}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    msg: `Stock insuficiente para: ${item.name}`,
                    productId: item.product,
                    available: product.stock
                });
            }
        }

        const preference = new Preference(mercadopagoClient);

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5000').trim();

        const items = order.orderItems.map(item => ({
            id: item.product ? item.product.toString() : 'item-' + Date.now(),
            title: item.name.trim().substring(0, 250),
            unit_price: Math.round(Number(item.price)),
            quantity: Number(item.quantity) || 1,
            currency_id: 'COP'
        }));

        const body = {
            items,
            back_urls: {
                success: `${frontendUrl}/order/${orderId}/success`,
                failure: `${frontendUrl}/order/${orderId}/failure`,
                pending: `${frontendUrl}/order/${orderId}/pending`
            },
            external_reference: orderId.toString(),
            metadata: {
                order_id: orderId.toString()
            }
        };

        if (backendUrl && !backendUrl.includes('localhost')) {
            body.notification_url = `${process.env.BACKEND_URL}/api/payments/webhook`;
        }

        console.log('Llamando a Mercado Pago con body:', JSON.stringify(body, null, 2));
        const result = await preference.create({ body });

        console.log('Preferencia creada:', result.id);
        res.json({ id: result.id });
    } catch (error) {
        console.error('ERROR CRITICO MERCADO PAGO:');
        console.error(error.message);

        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Body error:', JSON.stringify(error.response.data, null, 2));
            return res.status(500).json({
                msg: 'Mercado Pago rechazó la solicitud',
                error: error.message,
                detail: error.response.data
            });
        }

        res.status(500).json({
            msg: 'Error interno de servidor',
            error: error.message
        });
    }
});

// @desc    Mercado Pago Webhook
// @route   POST /api/payments/webhook
// @access  Public
router.post('/webhook', async (req, res) => {
    const { query } = req;
    const topic = query.topic || query.type;

    try {
        if (topic === 'payment') {
            const paymentId = query.id || query['data.id'];
            console.log('Payment Webhook Received:', paymentId);

            const payment = new Payment(mercadopagoClient);
            const paymentData = await payment.get({ id: paymentId });

            if (paymentData.status === 'approved') {
                const orderId = paymentData.external_reference;
                const order = await Order.findById(orderId);

                if (order && !order.isPaid) {
                    // 1. Update Order
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.status = 'Processing';
                    order.paymentResult = {
                        id: paymentData.id.toString(),
                        status: paymentData.status,
                        update_time: paymentData.date_approved,
                        email_address: paymentData.payer.email
                    };

                    await order.save();

                    // 2. Update Stock
                    for (const item of order.orderItems) {
                        const product = await Product.findById(item.product);
                        if (product) {
                            product.stock = Math.max(0, product.stock - item.quantity);
                            await product.save();
                        }
                    }

                    console.log(`Order ${orderId} marked as PAID and stock updated.`);
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
});

module.exports = router;
