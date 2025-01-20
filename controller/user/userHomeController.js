import Product from '../../models/product.js';

const getHome = async (req, res) => {
    try {
        // Fetch active products with their categories
        const products = await Product.find({ isActive: true })
            .populate({
            path: 'categoriesId',
            match: { isActive: true }
            })
            .sort({ createdAt: -1 })
            .limit(4);

        res.render('user/home', { 
            products: products.map(product => product.toObject()),
            title: 'Home'
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.render('user/home', { 
            products: [],
            title: 'Home'
        });
    }
};

export default { getHome}