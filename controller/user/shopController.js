import Product from '../../models/product.js';

const getShop = async (req, res) => {
    try {
        // Fetch products and populate categories
        const products = await Product.find({ isActive: true })
            .populate({
                path: 'categoriesId',
                match: { isActive: true }, // Filter active categories during population
            })
            .sort({ createdAt: -1 });

        // Filter out products whose populated categories are null or empty
        const filteredProducts = products.filter(product => product.categoriesId);

        res.render('user/shop', { 
            products: filteredProducts.map(product => product.toObject()),
            title: 'Home'
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.render('user/shop', { 
            products: [],
            title: 'SHOP'
        });
    }
};


export default { getShop} 