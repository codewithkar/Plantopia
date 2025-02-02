import Product from '../../models/product.js';
import Category from '../../models/category.js';
import Offer from '../../models/offers.js'
import {calculateFinalPrice} from '../../utils/offerCalculator.js'

const getShop = async (req, res) => {
    try {

        let products = [];


        // Fetch products and populate categories
        products = await Product.find({ isActive: true })
            .populate({
                path: 'categoriesId',
                match: { isActive: true }, // Filter active categories during population
            })
            .sort({ createdAt: -1 });


        // Filter out products whose populated categories are null or empty
        const filteredProducts = products.filter(product => product.categoriesId);
        
        const offers = await Offer.find({
            status: 'active',
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        const processedProducts = filteredProducts.map(product => {
            const productOffer = offers.find(offer => 
                offer.productIds && offer.productIds.some(id => id.equals(product._id))
            );
            
            const categoryOffer = offers.find(offer => 
                offer.categoryId && offer.categoryId.equals(product.categoriesId._id)
            );

            const discountPrice = calculateFinalPrice(product, categoryOffer, productOffer);

            return {
                ...product.toObject(),
                price: product.price,
                discountPrice: discountPrice,
                hasDiscount: discountPrice < product.price,
                discountPercentage: Math.round((product.price - discountPrice) / product.price * 100)
            };
        });

        res.render('user/shop', {
            products: processedProducts,
            title: 'Shop'
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.render('user/shop', {
            products: [],
            title: 'SHOP'
        });
    }
};


const searchProducts = async (req, res) => {
    try {
        let searchQuery = req.query.q;
        let products = []
        searchQuery = searchQuery ? searchQuery.trim() : '';
        
        if (searchQuery) {
            const searchRegx = new RegExp(searchQuery, 'i');
            const matchingCategories = await Category.find({ name: searchRegx }).select('_id');
            const categoryIds = matchingCategories.map(category => category._id);

            products = await Product.find({
                isActive: true,
                $or: [
                    { productName: searchRegx },  // Changed from name to productName
                    { description: searchRegx },
                    { type: searchQuery },
                    { categoriesId: { $in: categoryIds } }
                ]
            }).populate({
                path: 'categoriesId',
                match: { isActive: true }
            });

            // Transform products to match your template format
            products = products.filter(product => product.categoriesId).map(product => ({
                _id: product._id,
                productName: product.productName,
                price: product.price,
                imageUrl: product.imageUrl,
                stock: product.stock,
                type: product.type
            }));
        }
        
        res.json(products);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json([]);
    }
};
const getFilteredProducts = async (req, res) => {
    try {

        let products = []
        const { sortBy = 'default', category = '', size = '', minPrice, maxPrice, stockStatus } = req.query;
        let query = { isActive: true };       

        // Category filter
        if (category && category !== 'All') {
            query.type = category;
        }

        // Size filter
        if (size && size !== 'All') {
            query.size = size;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Stock status filter
        if (stockStatus === 'inStock') {
            query.stock = { $gt: 0 };
        } else if (stockStatus === 'outOfStock') {
            query.stock = 0;
        }

        // Sorting logic
        let sort = {};
        switch (sortBy) {
            case 'priceLowToHigh':
                sort = { price: 1 };
                break;
            case 'priceHighToLow':
                sort = { price: -1 };
                break;
            case 'ratingHighToLow':
                sort = { rating: -1 };
                break;
            case 'newArrivals':
                sort = { createdAt: -1 };
                break;
            default:
                sort = { _id: 1 };
        }

        // Fetch products from the database
        products = await Product.find(query).sort(sort);


        res.json(products);

} catch (error) {
    console.error('Error fetching products:', error);
    res.render('user/shop', {
        products: [],
        title: 'SHOP'
    });
}
};

export default { getShop, getFilteredProducts,searchProducts } 