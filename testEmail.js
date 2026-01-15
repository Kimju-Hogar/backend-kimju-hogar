const { sendOrderEmail } = require('./utils/emailService');

const mockOrder = {
    _id: 'TEST-123456',
    totalPrice: 150000,
    orderItems: [
        { name: 'Cojín Kawaii Rosa', quantity: 2, price: 50000 },
        { name: 'Lámpara Luna', quantity: 1, price: 50000 }
    ]
};

const mockUser = {
    name: 'Alex Developer',
    email: 'kimjuhogar@gmail.com' // Sending to self for testing
};

console.log('Iniciando prueba de envío de correo...');
sendOrderEmail(mockOrder, mockUser)
    .then(success => {
        if (success) console.log('✅ Correo enviado con éxito (revisa tu bandeja de entrada o spam).');
        else console.log('❌ Falló el envío del correo.');
    })
    .catch(err => console.error('Error fatal:', err));
