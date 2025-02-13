import Product from '../../models/product.js';
import Category from '../../models/category.js';
import Offer from '../../models/offers.js';
import { calculateFinalPrice } from '../../utils/offerCalculator.js';

const ITEMS_PER_PAGE = 6;

const getShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.q || '';
        const sortBy = req.query.sortBy || 'default';
        const category = req.query.category || '';
        const size = req.query.size || '';
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        const stockStatus = req.query.stockStatus;

        let query = { isActive: true };

        // Search functionality
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, 'i');
            const matchingCategories = await Category.find({ name: searchRegex }).select('_id');
            const categoryIds = matchingCategories.map(category => category._id);

            query.$or = [
                { productName: searchRegex },
                { description: searchRegex },
                { categoriesId: { $in: categoryIds } }
            ];
        }

        if (category && category !== 'All') {
            query.type = category;
        }
        if (size && size !== 'All') {
            query.size = size;
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }
        if (stockStatus === 'inStock') {
            query.stock = { $gt: 0 };
        } else if (stockStatus === 'outOfStock') {
            query.stock = 0;
        }

        const activeOffers = await Offer.find({
            status: 'active',
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        let sortOption = {};
        switch (sortBy) {
            case 'priceLowToHigh':
                sortOption = { offerPrice: 1, price: 1 };
                break;
            case 'priceHighToLow':
                sortOption = { offerPrice: -1, price: -1 };
                break;
            case 'ratingHighToLow':
                sortOption = { rating: -1 };
                break;
            case 'newArrivals':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        const products = await Product.find(query)
            .populate({
                path: 'categoriesId',
                match: { isActive: true },
            })
            .sort(sortOption)
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        const updatedProducts = await Promise.all(products.map(async (product) => {
            if (!product.categoriesId) return null; 
            const productOffer = activeOffers.find(offer => 
                offer.productIds && offer.productIds.some(id => id.equals(product._id))
            );
            
            const categoryOffer = activeOffers.find(offer => 
                offer.categoryId && offer.categoryId.equals(product.categoriesId._id)
            );

            const discountPrice = calculateFinalPrice(product, categoryOffer, productOffer);

            await Product.findByIdAndUpdate(product._id, {
                offerPrice: discountPrice,
                offerApplied: discountPrice < product.price,
                offerType: productOffer ? 'product' : (categoryOffer ? 'category' : 'none')
            });

            return {
                ...product.toObject(),
                discountPrice,
                hasDiscount: discountPrice < product.price,
                discountPercentage: Math.round((product.price - discountPrice) / product.price * 100)
            };
        }));

        const filteredProducts = updatedProducts.filter(Boolean);

        if (req.xhr) {
            return res.json({
                products: filteredProducts,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });
        }

        res.render('user/shop', {
            products: filteredProducts,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            searchQuery,
            title: 'Shop'
        });

    } catch (error) {
        console.error('Error in shop:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default { getShop };



// const getShop = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const searchQuery = req.query.q || '';
//         const sortBy = req.query.sortBy || 'default';
//         const category = req.query.category || '';
//         const size = req.query.size || '';
//         const minPrice = req.query.minPrice;
//         const maxPrice = req.query.maxPrice;
//         const stockStatus = req.query.stockStatus;

//         // Build query
//         let query = { isActive: true }; 

//         // Search functionality
//         if (searchQuery) {
//             const searchRegex = new RegExp(searchQuery, 'i');
//             const matchingCategories = await Category.find({ name: searchRegex }).select('_id');
//             const categoryIds = matchingCategories.map(category => category._id);

//             query.$or = [
//                 { productName: searchRegex },
//                 { description: searchRegex },
//                 { categoriesId: { $in: categoryIds } }
//             ];
//         }

//         // Apply filters
//         if (category && category !== 'All') {
//             query.type = category;
//         }
//         if (size && size !== 'All') {
//             query.size = size;
//         }
//         if (minPrice || maxPrice) {
//             query.price = {};
//             if (minPrice) query.price.$gte = parseFloat(minPrice);
//             if (maxPrice) query.price.$lte = parseFloat(maxPrice);
//         }
//         if (stockStatus === 'inStock') {
//             query.stock = { $gt: 0 };
//         } else if (stockStatus === 'outOfStock') {
//             query.stock = 0;
//         }

//         const allMatchingProducts = await Product.find(query)
//             .populate({
//                 path: 'categoriesId',
//                 match: { isActive: true },
//             });

//         // Filter out products with null categories
//         const filteredProducts = allMatchingProducts.filter(product => product.categoriesId);

//         // Fetch active offers
//         const offers = await Offer.find({
//             status: 'active',
//             startDate: { $lte: new Date() },
//             endDate: { $gte: new Date() }
//         });

//         // Process products with offers and calculate discount prices
//         const processedProducts = filteredProducts.map(product => {
//             const productOffer = offers.find(offer => 
//                 offer.productIds && offer.productIds.some(id => id.equals(product._id))
//             );
            
//             const categoryOffer = offers.find(offer => 
//                 offer.categoryId && offer.categoryId.equals(product.categoriesId._id)
//             );

//             const discountPrice = calculateFinalPrice(product, categoryOffer, productOffer);

//             return {
//                 ...product.toObject(),
//                 price: product.price,
//                 discountPrice: discountPrice,
//                 hasDiscount: discountPrice < product.price,
//                 discountPercentage: Math.round((product.price - discountPrice) / product.price * 100)
//             };
//         });

//         // Sort products based on the selected criteria
//         let sortedProducts = [...processedProducts];
//         switch (sortBy) {
//             case 'priceLowToHigh':
//                 sortedProducts.sort((a, b) => a.discountPrice - b.discountPrice);
//                 break;
//             case 'priceHighToLow':
//                 sortedProducts.sort((a, b) => b.discountPrice - a.discountPrice);
//                 break;
//             case 'ratingHighToLow':
//                 sortedProducts.sort((a, b) => b.rating - a.rating);
//                 break;
//             case 'newArrivals':
//                 sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//                 break;
//             default:
//                 sortedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//         }

//         // Apply pagination after sorting
//         const totalProducts = sortedProducts.length;
//         const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
//         const paginatedProducts = sortedProducts.slice(
//             (page - 1) * ITEMS_PER_PAGE,
//             page * ITEMS_PER_PAGE
//         );

//         if (req.xhr) {
//             return res.json({
//                 products: paginatedProducts,
//                 pagination: {
//                     currentPage: page,
//                     totalPages: totalPages,
//                     hasNextPage: page < totalPages,
//                     hasPrevPage: page > 1
//                 }
//             });
//         }

//         res.render('user/shop', {
//             products: paginatedProducts,
//             currentPage: page,
//             totalPages: totalPages,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//             searchQuery,
//             title: 'Shop'
//         });

//     } catch (error) {
//         console.error('Error in shop:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

