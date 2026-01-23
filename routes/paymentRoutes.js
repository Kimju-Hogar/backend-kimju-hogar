const express = require('express');
const router = express.Router();
const { Preference, Payment } = require('mercadopago');
const { mercadopagoClient } = require('../config/mercadopago');
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendOrderEmail } = require('../utils/emailService');

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

                    // 3. Send Confirmation Email
                    const user = await User.findById(order.user);
                    if (user) {
                        await sendOrderEmail(order, user);
                        console.log(`Confirmation email sent to ${user.email}`);
                    }
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
});

// @desc    Verify Payment Status (Frontend fallback)
// @route   POST /api/payments/verify_payment
// @access  Private
router.post('/verify_payment', auth, async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        console.log('--- VERIFICANDO PAGO (FRONTEND) ---');
        console.log(`Order: ${orderId}, Payment: ${paymentId}`);

        if (!orderId) {
            return res.status(400).json({ msg: 'Order ID is required' });
        }

        // Validate ObjectId format to prevent CastError
        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ msg: 'Invalid Order ID format' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        // If already paid, return success
        if (order.isPaid) {
            return res.json({ status: 'approved', order });
        }

        // Check against Mercado Pago if paymentId is provided
        if (paymentId && paymentId !== 'null' && paymentId !== 'undefined') {
            try {
                const payment = new Payment(mercadopagoClient);
                const paymentData = await payment.get({ id: paymentId });

                console.log('MP Status:', paymentData.status);

                if (paymentData.status === 'approved') {
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

                    // Update Stock
                    for (const item of order.orderItems) {
                        const product = await Product.findById(item.product);
                        if (product) {
                            product.stock = Math.max(0, product.stock - item.quantity);
                            await product.save();
                        }
                    }

                    // Send Confirmation Email
                    const user = await User.findById(order.user);
                    if (user) {
                        await sendOrderEmail(order, user);
                    }

                    return res.json({ status: 'approved', order });
                } else if (paymentData.status === 'in_process' || paymentData.status === 'pending') {
                    return res.json({ status: 'pending', order });
                } else {
                    return res.json({ status: 'rejected', order });
                }
            } catch (mpError) {
                console.error("Mercado Pago Verify Error:", mpError.message);
                // Return 500 but don't crash the whole server... actually we are in catch block
                // If MP fails, maybe return pending?
                // Or just return the current order status
                return res.json({ status: order.isPaid ? 'approved' : 'pending', order });
            }
        }

        res.json({ status: order.isPaid ? 'approved' : 'pending', order });

    } catch (error) {
        console.error('Verify Error Helper:', error);
        res.status(500).json({ msg: 'Error verifying payment', error: error.message });
    }
});

module.exports = router;
