import Product from '../../models/product.js';



const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .populate('categoriesId');

        if (!product) {
            return res.status(404).redirect('/home');
        }
        // Calculate final price with demo discount
        const discountAmount = product.price * 0.20; // 20% discount
        const finalPrice = product.price - discountAmount;
        // Demo offer data
    

        // Calculate final price with offers
        // const finalPrice = calculateFinalPrice(product, categoryOffer, productOffer);
        
        const processedProduct = {
            ...product.toObject(),
            discountPrice: finalPrice,
            originalPrice: product.price,
            offerApplied: finalPrice < product.price,

        };

        // Find and process related products
        const relatedProducts = await Product.find({
            categoriesId: product.categoriesId,
            isActive: true,
            _id: { $ne: productId }
        })
        .limit(5);

        const processedRelatedProducts = relatedProducts.map(relProduct => {
           
            
            const discountAmount = product.price * 0.20; // 20% discount
            const finalPrice = product.price - discountAmount;
            
            return {
                ...relProduct.toObject(),
                discountAmount: finalPrice,
                originalPrice: relProduct.price,
                offerApplied: finalPrice < relProduct.price,
                
            };
        });

        res.render('user/viewProduct', { 
            product: processedProduct,
            relatedProducts: processedRelatedProducts,
            title: product.productName
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).redirect('/home');
    }
};


export default {
    getProductDetails,
}; 