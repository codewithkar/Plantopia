import Address from '../../models/address.js'; 
import Cart from '../../models/cart.js';    
import Order from '../../models/order.js';
import product from '../../models/product.js';

    const loadCheckoutPage = async (req, res) => {
        try {
            const userId = req.session.user;
            const addresses = await Address.find({ userId: userId });

            // Get cart items with populated product details
            const cart = await Cart.findOne({ userId: req.session.user });
            
            if (!cart || cart.items.length === 0) {
                return res.redirect('/cart');
            }

            // Populate product details and calculate subtotals
            const populatedCart = await Cart.findOne({ userId: req.session.user })
                .populate({
                    path: 'items.productId',
                    model: 'Product',
                    select: 'productName imageUrl price stock'
                });

            // Check stock availability
            const stockCheck = populatedCart.items.every(item => 
                item.productId.stock >= item.quantity
            );

            if (!stockCheck) {
                return res.redirect('/cart?error=stock');
            }

            // Format cart items for the template
            const cartItems = populatedCart.items.map(item => ({
                product: {
                    _id: item.productId._id,
                    productName: item.productId.productName,
                    imageUrl: item.productId.imageUrl,
                },
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price
            }));

            // Calculate total
            const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
            res.render('user/checkout', {
                addresses,
                cartItems,
                totalPrice,
                user: req.session.user,
            });
            
        } catch (error) {
            console.error('Error loading checkout page:', error);
            res.status(500).send('Internal Server Error');
        }
    };

    export default { 
        loadCheckoutPage,
        placeOrder,
    };