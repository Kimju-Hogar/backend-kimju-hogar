const { MercadoPagoConfig } = require('mercadopago');

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error('CRITICAL: MERCADOPAGO_ACCESS_TOKEN is missing in .env');
}

const mercadopagoClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

module.exports = { mercadopagoClient };
