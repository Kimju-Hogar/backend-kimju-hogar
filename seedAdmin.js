const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('MongoDB Connected');

    const adminExists = await User.findOne({ email: 'admin@kimjuhogar.com' });
    if (adminExists) {
        console.log('Admin already exists');
        process.exit();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = new User({
        name: 'Admin User',
        email: 'admin@kimjuhogar.com',
        password: hashedPassword,
        role: 'admin',
        isAdmin: true // Ensure your schema supports this or relies on role
    });

    await admin.save();
    console.log('Admin User Created: admin@kimjuhogar.com / admin123');
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
