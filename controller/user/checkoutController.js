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
    
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { addressId,paymentMethod } = req.body;
        const items = await Cart.findOne({ userId });
        const address = await Address.findOne({ _id: addressId });
        

        const order = new Order({
            userId: userId,
            orderCode: Math.random().toString(36).substring(7),
            shippingAddress: {
                fullName: address.fullName,
                mobileNumber: address.mobileNumber,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2,
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },
            items: items.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
            totalAmount: items.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
            payment: {
                method: paymentMethod,
                paymentStatus: paymentMethod === 'cod' ? 'pending' : null
            },
            order: {status: 'processing'},
            totalPrice: items.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
        });
        
        await order.save();
        // Decrease the quantity from the stock of the product
        for (const item of items.items) {
            await product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }
        await Cart.findOneAndDelete({ userId });
        return res.json({
        success: true,
        orderId: order._id
        });
    }
    catch (error) {
        console.error('Error placing order:', error);
        // res.status(500).send('Internal Server Error');  
    }
}
    export default { 
        loadCheckoutPage,
        placeOrder,
    };