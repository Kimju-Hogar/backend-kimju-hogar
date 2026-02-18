const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Sync product from Panel (Create or Update)
// @route   POST /api/sync/products
// @access  Private (Sync Secret)
const syncProduct = async (req, res) => {
    try {
        const {
            sku,
            name,
            description, // Optional
            price,
            stock,
            image,
            category,
            type
            // sizes - Hogar model doesn't seem to have sizes in the schema I viewed, 
            // but it has 'variations'. Panel sends 'sizes'.
            // I'll map sizes to variations?
        } = req.body;

        let product = await Product.findOne({
            // Hogar model doesn't have explicit SKU field in the schema I viewed (Step 33)!
            // It has name, price, category...
            // Wait, I need to check if I can add SKU to Hogar model or use Name as key?
            // Using Name is risky.
            // I should ADD sku to Hogar model.
            // But for now, let's assume I should match by Name if SKU missing?
            // Or better, add SKU field to Hogar model.
            // Let's check if I can match by 'name' as a fallback, but really I should add SKU.
        });

        // Re-reading Step 33 (Hogar Product.js):
        // Schema: name, description, price, category, variations, discount, image, images, stock, isFeatured, tags.
        // NO SKU.

        // Strategy: I will add 'sku' field to the schema in a separate step.
        // For now, I'll write this controller assuming 'sku' exists or I'll use 'name' temporarily?
        // No, strict sync requires unique ID.
        // I will search by 'name' for now to be safe if SKU not there, 
        // BUT I will also update the model to include SKU.

        // Let's check if 'sku' is in keys.
        // If I can't change the model easily (might break existing frontend?), 
        // I'll use a unique tag 'sku:123' or something? No that's messy.
        // Best is to add sku to schema.

        // --- Category Handling ---
        if (category) {
            let catDoc = await Category.findOne({ name: category });
            if (!catDoc) {
                // Create Category if not exists
                // Generate simple slug
                const slug = category.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

                catDoc = new Category({
                    name: category,
                    slug: slug,
                    description: `Category for ${category}`,
                    icon: 'Box' // Default icon
                });
                try {
                    await catDoc.save();
                    console.log(`Created new category: ${category}`);
                } catch (catErr) {
                    console.error("Error creating category during sync:", catErr.message);
                    // Continue even if category creation fails (maybe duplicate slug?)
                }
            }
        }

        // Let's try to find by Name first since that's what we have.

        // Let's try to find by Name first since that's what we have.
        product = await Product.findOne({ name: name });

        if (product) {
            // Update
            product.price = price;
            product.stock = stock;
            product.image = image;
            product.category = category;
            // product.description = description || product.description; 

            // Map sizes/types if possible
            // product.variations = ...?

            await product.save();
            return res.json({ message: 'Product updated', product });
        } else {
            // Create
            product = new Product({
                name,
                price,
                stock, // 3% increased price passed from Panel
                image,
                category,
                description: description || name,
                // Add SKu if possible
                sku: sku, // Will be ignored if not in schema unless strict: false
                variations: [] // Initialize
            });

            // If Panel has sizes, maybe put them in variations?
            // Panel product has 'sizes' array.

            await product.save();
            return res.status(201).json({ message: 'Product created', product });
        }

    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { syncProduct };
