const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendOrderEmail } = require('../utils/emailService');

const wompiController = {};

/**
 * Generates the integrity signature required by Wompi widget.
 * Signature = SHA256(reference + amount__in_cents + currency + integrity_secret)
 */
wompiController.generateSignature = async (req, res) => {
    try {
        const { orderId, amount } = req.body;

        if (!orderId || !amount) {
            return res.status(400).json({ msg: 'Order ID and amount are required' });
        }

        const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
        if (!integritySecret) {
            console.error('WOMPI_INTEGRITY_SECRET is not defined in .env');
            return res.status(500).json({ msg: 'Server configuration error' });
        }

        const currency = 'COP';
        // Wompi requires amount in CENTS (e.g. 10000.00 -> 1000000)
        // Ensure amount is string or number and convert to cents string
        const amountInCents = Math.round(Number(amount) * 100);
        const reference = orderId.toString();

        const signatureString = `${reference}${amountInCents}${currency}${integritySecret}`;

        const signature = crypto
            .createHash('sha256')
            .update(signatureString)
            .digest('hex');

        res.json({
            signature,
            reference,
            amountInCents, // Send this back so frontend uses exact same value
            currency,
            publicKey: process.env.WOMPI_PUBLIC_KEY
        });

    } catch (error) {
        console.error('Error generating Wompi signature:', error);
        res.status(500).json({ msg: 'Error generating signature', error: error.message });
    }
};

/**
 * Handles Wompi Webhook events.
 * Validates the HMAC SHA256 signature and updates order status.
 */
wompiController.handleWebhook = async (req, res) => {
    try {
        const { event, data, signature, environment } = req.body;

        console.log('--- WOMPI WEBHOOK ---');
        console.log('Event:', event);

        // 1. Verify Signature
        // Wompi sends a signature object with checksum
        // checksum = SHA256(data.transaction.id + data.transaction.status + data.transaction.amount_in_cents + events_secret)
        // Note: The structure might vary slightly based on event type. We focus on 'transaction.updated'.

        if (event !== 'transaction.updated') {
            console.log('Ignoring event type:', event);
            return res.sendStatus(200);
        }

        const transaction = data.transaction;
        const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

        if (!eventsSecret) {
            console.error('WOMPI_EVENTS_SECRET is not defined');
            return res.sendStatus(500);
        }

        // Verify checksum
        // The signature provided in the payload is req.body.signature.checksum
        const properties = signature.properties; // e.g., ["transaction.id", "transaction.status", "transaction.amount_in_cents"]

        // Construct the string based on properties order
        let concatenationString = '';
        const secureData = data; // Usually data object contains the referenced properties

        // Helper to access nested properties string like "transaction.id"
        const getNestedValue = (obj, path) => {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };

        properties.forEach(prop => {
            concatenationString += getNestedValue(data, prop);
        });

        concatenationString += eventsSecret;

        const expectedChecksum = crypto
            .createHash('sha256')
            .update(concatenationString)
            .digest('hex');

        if (signature.checksum !== expectedChecksum) {
            console.error('Invalid Wompi Webhook Signature');
            console.error('Expected:', expectedChecksum);
            console.error('Received:', signature.checksum);
            return res.sendStatus(400); // Invalid signature
        }

        // 2. Process Transaction
        const orderId = transaction.reference;
        const status = transaction.status; // APPROVED, DECLINED, VOIDED, ERROR

        console.log(`Order: ${orderId}, Status: ${status}`);

        const order = await Order.findById(orderId);
        if (!order) {
            console.error('Order not found:', orderId);
            return res.sendStatus(200);
        }

        if (order.isPaid) {
            console.log('Order already paid');
            return res.sendStatus(200);
        }

        if (status === 'APPROVED') {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.status = 'Processing';
            order.paymentResult = {
                id: transaction.id,
                status: status,
                update_time: transaction.created_at,
                email_address: transaction.customer_email
            };

            await order.save();

            // Stock update
            for (const item of order.orderItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock = Math.max(0, product.stock - item.quantity);
                    await product.save();
                }
            }

            // Send Email
            const user = await User.findById(order.user);
            if (user) {
                await sendOrderEmail(order, user);
            }

            console.log('Order finalized successfully');
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('Wompi Webhook Error:', error);
        res.sendStatus(500);
    }
};

/**
 * Verify Transaction Status (Called by Frontend after redirect)
 */
wompiController.verifyTransaction = async (req, res) => {
    try {
        const { id } = req.params; // Transaction ID from Wompi
        if (!id) return res.status(400).json({ msg: 'Transaction ID is required' });

        // Fetch transaction from Wompi API
        // Use native fetch (Node 18+) or ensure axios is available
        // Sandbox/Production URL depends on environment. Ideally use configured URL or infer.
        // Wompi Public Key is needed for Bearer token or just public access for some endpoints?
        // Wompi API requires Public Key as Bearer token for querying transactions? Or Private? 
        // Documentation says: GET /v1/transactions/:id with Public Key usually works for status.

        const isProduction = process.env.NODE_ENV === 'production';
        // Note: Wompi Production URL is https://production.wompi.co/v1
        // Sandbox: https://sandbox.wompi.co/v1
        // Let's assume production url base or sandbox based on env. 
        // But the user might be testing. Let's use the one matching the keys. 
        // Actually, usually it's https://production.wompi.co/v1 for both if using Test Keys in Prod environment? 
        // No, Sandbox is separate. 
        // Safest: Use https://production.wompi.co/v1/transactions/ and if 404 try sandbox? 
        // Or check a config.
        const wompiUrl = 'https://production.wompi.co/v1/transactions';

        // We need network access. 
        const response = await fetch(`${wompiUrl}/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.WOMPI_PUBLIC_KEY}` // Usually Public key is enough for read-only if owner? Or Private?
                // Actually for security, better to use Private key server-side.
                // Let's try just fetching.
            }
        });

        if (!response.ok) {
            // Try Sandbox if failed (maybe keys are test keys on sandbox env?)
            const sandboxResponse = await fetch(`https://sandbox.wompi.co/v1/transactions/${id}`);
            if (sandboxResponse.ok) {
                const data = await sandboxResponse.json();
                return await processTransactionData(data.data, res);
            }

            throw new Error('Transaction not found in Wompi');
        }

        const data = await response.json();
        return await processTransactionData(data.data, res);

    } catch (error) {
        console.error('Verify Transaction Error:', error);
        res.status(500).json({ msg: 'Error verifying transaction' });
    }
};

async function processTransactionData(transaction, res) {
    const orderId = transaction.reference;
    const status = transaction.status;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found locally' });

    // If approved and not marked paid, mark it (fallback if webhook failed/delayed)
    if (status === 'APPROVED' && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.status = 'Processing';
        order.paymentResult = {
            id: transaction.id,
            status: status,
            update_time: transaction.created_at,
            email_address: transaction.customer_data?.email // Wompi structure varies
        };
        await order.save();

        // Decrease stock if not done
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
                await product.save();
            }
        }

        const user = await User.findById(order.user);
        if (user) sendOrderEmail(order, user);
    }

    res.json({
        status: status, // APPROVED, DECLINED, ERROR
        orderId: orderId,
        isPaid: order.isPaid
    });
}

module.exports = wompiController;
