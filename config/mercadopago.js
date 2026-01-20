const { MercadoPagoConfig } = require('mercadopago');

let cachedClient = null;

function getMercadoPagoClient() {
    if (cachedClient) return cachedClient;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('MERCADOPAGO_ACCESS_TOKEN is missing');
    }

    cachedClient = new MercadoPagoConfig({
        accessToken
    });

    return cachedClient;
}

module.exports = { getMercadoPagoClient };
