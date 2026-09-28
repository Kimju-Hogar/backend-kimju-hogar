/**
 * Respaldo de la coleccion `orders` antes de correr la conciliacion de pagos
 * a cuotas. Es la misma base de datos que usan las dos tiendas y el Panel,
 * asi que un solo respaldo cubre las ordenes de Hogar y de Calzado.
 *
 * Uso: node scripts/backupOrders.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const main = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const orders = await mongoose.connection.db.collection('orders').find({}).toArray();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = path.join(backupDir, `orders_backup_${timestamp}.json`);
    fs.writeFileSync(file, JSON.stringify(orders, null, 2));

    console.log(`Ordenes respaldadas: ${orders.length}`);
    console.log(`Archivo: ${file}`);

    await mongoose.disconnect();
};

main().catch((err) => {
    console.error('Error en el respaldo de ordenes:', err.message);
    process.exit(1);
});
