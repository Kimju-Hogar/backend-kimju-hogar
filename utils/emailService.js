const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Kawaii Template Generator ---
const getTemplate = (title, content, actionLink = null, actionText = null) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fdf2f8; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 30px; overflow: hidden; box-shadow: 0 20px 40px rgba(236, 72, 153, 0.15); border: 4px solid #fce7f3; }
            .header { background: linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%); padding: 50px 20px; text-align: center; position: relative; overflow: hidden; }
            .header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.2) 20%, transparent 20%); background-size: 20px 20px; opacity: 0.5; }
            .logo { font-size: 36px; font-weight: 900; color: #fff; letter-spacing: -1px; text-transform: uppercase;position: relative; text-shadow: 2px 2px 0px rgba(219, 39, 119, 0.3); }
            .logo span { color: #fdf2f8; font-weight: 300; }
            .content { padding: 50px 40px; text-align: center; color: #4b5563; background-image: radial-gradient(#fce7f3 1px, transparent 1px); background-size: 30px 30px; }
            .title { font-size: 28px; font-weight: 800; color: #db2777; margin-bottom: 20px; line-height: 1.2; }
            .text { font-size: 16px; line-height: 1.8; margin-bottom: 30px; color: #6b7280; font-weight: 500; }
            .items-box { background: #fff; border-radius: 20px; padding: 25px; text-align: left; margin-bottom: 30px; border: 2px dashed #fbcfe8; box-shadow: 5px 5px 0px #fce7f3; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; color: #db2777; font-weight: 700; border-bottom: 1px solid #fce7f3; padding-bottom: 8px; }
            .item-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
            .total { font-size: 22px; font-weight: 900; color: #be185d; text-align: right; margin-top: 20px; }
            .btn { display: inline-block; background: #db2777; color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 25px; box-shadow: 0 10px 20px rgba(219, 39, 119, 0.25); transition: transform 0.2s; }
            .btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(219, 39, 119, 0.35); }
            .footer { background: #fdf4f9; padding: 40px; text-align: center; font-size: 13px; color: #9ca3af; font-weight: 600; border-top: 1px solid #fce7f3; }
            .footer-links { margin-bottom: 20px; }
            .footer-links a { color: #db2777; text-decoration: none; margin: 0 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Kimju<span>Hogar</span> 🌸</div>
            </div>
            <div class="content">
                <div class="title">${title}</div>
                <div class="text">${content}</div>
                ${actionLink ? `<a href="${actionLink}" class="btn">${actionText}</a>` : ''}
            </div>
            <div class="footer">
                <div class="footer-links">
                    <a href="https://kimjuhogar.com/shop">Tienda</a> •
                    <a href="https://kimjuhogar.com/profile">Mi Cuenta</a> •
                    <a href="https://kimjuhogar.com/contact">Ayuda</a>
                </div>
                <p>Hecho con 💖 para tu hogar.</p>
                <p>&copy; ${new Date().getFullYear()} Kimju Hogar. Valledupar, Colombia.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const sendOrderEmail = async (order, user) => {
    try {
        console.log(`[EMAIL] Sending Order to ${user.email}`);

        const itemsHtml = `
            <div class="items-box">
                ${order.orderItems.map(item => `
                    <div class="item-row">
                        <span>${item.name} (x${item.quantity})</span>
                        <span>$${item.price.toLocaleString()}</span>
                    </div>
                `).join('')}
                <div class="total">Total: $${order.totalPrice.toLocaleString()}</div>
            </div>
        `;

        const htmlContent = getTemplate(
            `¡Gracias por tu compra, ${user.name.split(' ')[0]}! 💖`,
            `Estamos preparando tu pedido #${order._id} con mucho cuidado y cariño. Aquí tienes un resumen de tus cositas maravillosas:<br/><br/>${itemsHtml}`,
            'https://kimjuhogar.com/profile', // Link to view order
            'Ver mi Pedido'
        );

        const mailOptions = {
            from: '"Kimju Hogar" <no-reply@kimjuhogar.com>',
            to: user.email,
            subject: `¡Tu pedido #${order._id} está confirmado! 🌸`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email handling error:', error);
        return false;
    }
};

const sendRecoveryEmail = async (user, token) => {
    try {
        console.log(`[EMAIL] Sending Recovery to ${user.email}`);

        // Link to Frontend Reset Page
        const resetUrl = `${process.env.BASE_URL}/reset-password/${token}`;

        const htmlContent = getTemplate(
            'Restablecer Contraseña 🔐',
            `Hola ${user.name.split(' ')[0]}, hemos recibido una solicitud para cambiar tu contraseña. Si no fuiste tú, ignora este mensaje.<br/><br/>Para crear una nueva contraseña, haz clic en el siguiente botón:`,
            resetUrl,
            'Restablecer Contraseña'
        );

        const mailOptions = {
            from: '"Kimju Hogar" <no-reply@kimjuhogar.com>',
            to: user.email,
            subject: 'Recuperación de Contraseña - Kimju Hogar',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email handling error:', error);
        return false;
    }
};

const sendEmail = async ({ email, subject, html }) => {
    try {
        const mailOptions = {
            from: '"Kimju Hogar" <no-reply@kimjuhogar.com>',
            to: email,
            subject: subject,
            html: html
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Email handling error:', error);
        throw error; // Re-throw to handle in controller
    }
};

module.exports = { sendOrderEmail, sendRecoveryEmail, sendEmail, getTemplate };
