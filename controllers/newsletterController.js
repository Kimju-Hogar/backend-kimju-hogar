const Newsletter = require('../models/Newsletter');
const { sendEmail, getTemplate } = require('../utils/emailService');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter
exports.subscribeCallback = async (req, res) => {
    const { email, website } = req.body;

    // Honeypot Protection
    if (website) {
        return res.status(201).json({ msg: '¡Suscripción exitosa! Revisa tu correo. 💌' });
    }

    if (!email) {
        return res.status(400).json({ msg: 'Por favor ingresa un correo electrónico.' });
    }

    try {
        // Check if already subscribed
        let subscriber = await Newsletter.findOne({ email });

        if (subscriber) {
            return res.status(400).json({ msg: '¡Ya estás suscrito a nuestro club! 🌸' });
        }

        subscriber = new Newsletter({ email });
        await subscriber.save();

        // Send Welcome Email
        const emailSubject = '¡Bienvenido al Club Kimju! 💖';

        const welcomeContent = `
            ¡Hola! 🌸<br><br>
            Estamos súper felices de que te hayas unido a nuestra familia Kimju. 
            Ahora serás el primero en enterarte de:
            <ul style="color: #db2777; font-weight: bold; list-style-type: none; padding: 10px 0;">
                <li style="margin-bottom: 10px;">✨ Nuevas colecciones kawaii</li>
                <li style="margin-bottom: 10px;">🎁 Descuentos exclusivos</li>
                <li style="margin-bottom: 10px;">💖 Tips de decoración</li>
            </ul>
            ¡Gracias por dejarnos llenar tu hogar de magia!
        `;

        const emailHtml = getTemplate(
            '¡Bienvenido al Club! ✨',
            welcomeContent,
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'Ir a la Tienda'
        );

        try {
            await sendEmail({
                email: subscriber.email,
                subject: emailSubject,
                html: emailHtml
            });
        } catch (emailErr) {
            console.error("Newsletter email failed", emailErr);
            // Don't fail the request if email fails, just log it
        }

        res.status(201).json({ msg: '¡Suscripción exitosa! Revisa tu correo. 💌' });

    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Este correo ya está registrado.' });
        }
        res.status(500).send('Server Error');
    }
};
