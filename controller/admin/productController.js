import fs from 'fs';
import path from 'path';
import Product from '../../models/product.js';
import Category from '../../models/category.js';
import upload from '../../utils/multer.js'

// Controller function to render the product page
const getProductPage = async (req, res) => {
    try {
        // Fetch products with populated references
        const products = await Product.find()
            .populate('categoriesId')
            .sort({ createdAt: -1 });

        // Sanitize products for JSON serialization
        const sanitizedProducts = products.map(product => {
            const sanitized = product.toObject();
            // Ensure all necessary fields are present
            return {
                ...sanitized,
                _id: sanitized._id.toString(),
                categoriesId: {
                    _id: sanitized.categoriesId._id.toString(),
                    name: sanitized.categoriesId.name
                },
                imageUrl: sanitized.imageUrl || []
            };
        });

        res.render('admin/product', {
            products: sanitizedProducts,
            categories: await Category.find()
        });
    } catch (error) {
        console.error('Error rendering product page:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const addProduct = async (req, res) => {
    const uploadMultiple = upload.array('images', 3);

    uploadMultiple(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            // Check if files were uploaded
            if (!req.files || req.files.length !== 3) {
                return res.status(400).json({ message: 'Please upload exactly 3 images' });
            }

            // Validate file types and sizes
            for (const file of req.files) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    return res.status(400).json({ message: 'Each image must be less than 5MB' });
                }

                const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
                if (!validTypes.includes(file.mimetype)) {
                    return res.status(400).json({ message: 'Invalid file type. Only JPG, JPEG, PNG, and WebP are allowed' });
                }
            }

            const {
                productName,
                type,
                categoriesId,
                size,
                description,
                price,
                stock
            } = req.body;

            // Additional validation
            if (!productName || !type || !categoriesId || !price || !stock) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Process and save the images
            const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

            const newProduct = new Product({
                productName: productName.trim(),
                type,
                categoriesId,
                size: size.trim(),
                description: description.trim(),
                price: parseFloat(price),
                stock: parseInt(stock),
                imageUrl: imageUrls,
                isActive: true
            });

            await newProduct.save();
            res.status(201).json({ message: 'Product added successfully' });

        } catch (error) {
            // Delete uploaded files if there's an error
            if (req.files) {
                req.files.forEach(file => {
                    const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }
            
            console.error('Error adding product:', error);
            res.status(500).json({ message: error.message || 'Internal server error' });
        }
    });
};

const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoriesId');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Convert to plain object and sanitize
        const sanitizedProduct = {
            _id: product._id.toString(),
            productName: product.productName,
            type: product.type,
            categoriesId: {
                _id: product.categoriesId._id.toString(),
                name: product.categoriesId.name
            },
            size: product.size,
            description: product.description,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl || [],
            isActive: product.isActive
        };

        res.json(sanitizedProduct);
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ message: 'Error fetching product details' });
    }
};

const updateProduct = async (req, res) => {
    const uploadMultiple = upload.array('images', 3);

    uploadMultiple(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const productId = req.params.id;
            const existingProduct = await Product.findById(productId);
            
            if (!existingProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const {
                productName,
                type,
                categoriesId,
                size,
                description,
                price,
                stock,
                imageIndexes
            } = req.body;

            // Validate required fields
            if (!productName || !categoriesId || !price || !stock) {
                return res.status(400).json({ message: 'All required fields must be filled' });
            }

            // Handle image updates
            let updatedImageUrls = [...existingProduct.imageUrl];

            if (req.files && req.files.length > 0 && imageIndexes) {
                const indexes = imageIndexes.split(',').map(Number);
                
                // Process each new image
                req.files.forEach((file, i) => {
                    const updateIndex = indexes[i];
                    if (updateIndex >= 0 && updateIndex < 3) {
                        // Delete old image if it exists
                        const oldImagePath = path.join(process.cwd(), 'public', existingProduct.imageUrl[updateIndex]);
                        try {
                            if (fs.existsSync(oldImagePath)) {
                                fs.unlinkSync(oldImagePath);
                            }
                        } catch (error) {
                            console.error('Error deleting old image:', error);
                        }
                        
                        // Update with new image
                        updatedImageUrls[updateIndex] = `/uploads/products/${file.filename}`;
                    }
                });
            }

            // Update product fields
            const updatedProduct = {
                productName: productName.trim(),
                type,
                categoriesId,
                size: size.trim(),
                description: description.trim(),
                price: parseFloat(price),
                stock: parseInt(stock),
                imageUrl: updatedImageUrls
            };

            // Update the product
            await Product.findByIdAndUpdate(productId, updatedProduct, { new: true });
            
            res.status(200).json({ message: 'Product updated successfully' });

        } catch (error) {
            // Delete any newly uploaded files if there's an error
            if (req.files) {
                req.files.forEach(file => {
                    const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', file.filename);
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (err) {
                        console.error('Error deleting file:', err);
                    }
                });
            }
            
            console.error('Error updating product:', error);
            res.status(500).json({ message: 'Error updating product: ' + error.message });
        }
    });
};

const toggleProductStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.isActive = !product.isActive;
        await product.save();

        res.json({
            message: 'Product status updated',
            isActive: product.isActive
        });
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default { getProductPage, addProduct, getProductDetails, updateProduct, toggleProductStatus };