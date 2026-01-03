const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    // Variations support
    variations: [{
        sku: String,
        price: Number,
        stock: Number,
        attributes: {
            color: String,
            size: String,
            material: String
        },
        image: String
    }],
    discount: {
        type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
        value: { type: Number, default: 0 }
    },
    image: {
        type: String,
        required: true
    },
    images: [{
        type: String, // URLs to images
    }],
    stock: {
        type: Number,
        required: true,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
