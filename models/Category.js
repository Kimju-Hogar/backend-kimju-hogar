const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        lowercase: true,
        unique: true
    },
    description: {
        type: String
    }
}, { timestamps: true });

CategorySchema.pre('save', function (next) {
    this.slug = this.name.toLowerCase().split(' ').join('-');
    next();
});

module.exports = mongoose.model('Category', CategorySchema);
