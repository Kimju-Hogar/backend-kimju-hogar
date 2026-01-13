const nodemailer = require('nodemailer');

// Configure transporter
// In production, use environment variables for these values
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your SMTP provider
    auth: {
        user: process.env.EMAIL_USER || 'test@example.com', // Replace with valid env vars later
        pass: process.env.EMAIL_PASS || 'password'
    }
});

exports.sendOrderEmail = async (order, user) => {
    const mailOptions = {
        from: '"Kimju Hogar" <noreply@kimjuhogar.com>',
        to: user.email,
        subject: `Confirmación de Pedido ${order._id}`,
        html: `
            <h1>Gracias por tu compra, ${user.name}!</h1>
            <p>Hemos recibido tu pedido con ID: <strong>${order._id}</strong></p>
            <p>Total: $${order.totalPrice}</p>
            <p>Te notificaremos cuando sea enviado.</p>
        `
    };

    const adminMailOptions = {
        from: '"Kimju System" <noreply@kimjuhogar.com>',
        to: 'designe@kimjuhogar.com', // Admin email requested
        subject: `Nuevo Pedido Recibido: ${order._id}`,
        html: `
            <h1>Nuevo Pedido!</h1>
            <p>Cliente: ${user.name} (${user.email})</p>
            <p>Total: $${order.totalPrice}</p>
            <p>Items: ${order.orderItems.length}</p>
        `
    };

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'test@example.com') {
        console.log('Skipping emails: EMAIL_USER not configured.');
        return;
    }

    try {
        await transporter.sendMail(mailOptions);
        await transporter.sendMail(adminMailOptions);
        console.log('Emails sent successfully');
    } catch (error) {
        console.error('Error sending emails:', error.message);
    }
};
