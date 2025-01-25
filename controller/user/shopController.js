import Product from '../../models/product.js';
import Category from '../../models/category.js';

const getShop = async (req, res) => {

    try {

        let searchQuery = req.query.q;
        searchQuery = searchQuery ? searchQuery.trim() : '';
        let products = [];

        if (searchQuery) {
            const searchRegx = new RegExp(searchQuery, 'i');
            const matchingCategories = await Category.find({ name: searchRegx }).select('_id');
            const categoryIds = matchingCategories.map(category => category._id);

            products = await Product.find({
                isActive: true,
                $or: [
                    { name: searchRegx },
                    { description: searchRegx },
                    { type: searchQuery },
                    { categoriesId: { $in: categoryIds } } // Match products by category IDs
                ]
            })
            if (!products || products.length === 0) {
                return res.status(500).render('user/productNotFound');

            }
        } else {
            // Fetch products and populate categories
            products = await Product.find({ isActive: true })
                .populate({
                    path: 'categoriesId',
                    match: { isActive: true }, // Filter active categories during population
                })
                .sort({ createdAt: -1 });
        }
        
        // Filter out products whose populated categories are null or empty
        const filteredProducts = products.filter(product => product.categoriesId);

        res.render('user/shop', {
            products: filteredProducts.map(product => product.toObject()),
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


export default { getShop } 