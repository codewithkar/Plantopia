import orderSchema from '../../models/order.js';
import userSchema from '../../models/users.js';
import productSchema from '../../models/product.js';
import Wallet from '../../models/wallet.js'; 
import razorpay from '../../utils/razorpay.js';
import crypto from 'crypto';

const getOrders = async (req, res) => {
    try {
        const user = await userSchema.findById(req.session.user);

        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Orders per page
        
        // Get total orders count
        const totalOrders = await orderSchema.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);
        
        // Get paginated orders
        const orders = await orderSchema.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('items.product');

        res.render('user/viewOrder', { 
            orders,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            user
        });
    } catch (error) {
        console.error('Get orders error:', error);
        // res.status(500).render('error', { message: 'Error fetching orders' });
    }
}
 
const cancelOrder =  async (req, res) => {
    try {
        const { orderId, productId } = req.params;  // Get from URL parameters
        const { reason } = req.body;   // Get from request body
        const userId = req.session.user;
        
        

        const order = await orderSchema.findOne({ _id: orderId, userId })
            .populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find the specific item
        const itemIndex = order.items.findIndex(item => 
            item.product._id.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        const item = order.items[itemIndex];

        // Check if item can be cancelled
        if (!['pending', 'processing'].includes(item.order.status)) {
            return res.status(400).json({
                success: false,
                message: 'This item cannot be cancelled at this stage'
            });
        }

        // Update product stock
        await productSchema.findByIdAndUpdate(
            productId,
            { $inc: { stock: item.quantity } }
        );

        // Update item status
        item.order.status = 'cancelled';
        item.order.statusHistory.push({
            status: 'cancelled',
            date: new Date(),
            comment: `Item cancelled by user: ${reason}`
        });

        // Process refund if payment was made
        if (['wallet', 'online', 'razorpay'].includes(order.payment.method) && 
            order.payment.paymentStatus === 'completed') {
            
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId, balance: 0 });
            }

            // Calculate refund amount for this item
            const refundAmount = item.subtotal;

            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for cancelled item in order #${order.orderCode}`,
                orderId: order._id,
                date: new Date()
            });

            await wallet.save();
        }

        await order.save();

        res.json({
            success: true,
            message: 'Item cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel item error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error cancelling item'
        });
    }
}
const requestReturnItem = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { reason } = req.body;
        const userId = req.session.user;

        const order = await orderSchema.findOne({ _id: orderId, userId })
            .populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find the specific item
        const itemIndex = order.items.findIndex(item => 
            item.product._id.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        const item = order.items[itemIndex];

        // Check if item is delivered
        if (item.order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Only delivered items can be returned'
            });
        }

        // Check if return is already requested
        if (item.return.isReturnRequested) {
            return res.status(400).json({
                success: false,
                message: 'Return already requested for this item'
            });
        }

        // Check return window (7 days)
        const deliveryDate = item.order.statusHistory
            .find(h => h.status === 'delivered')?.date;

        if (!deliveryDate) {
            return res.status(400).json({
                success: false,
                message: 'Delivery date not found'
            });
        }

        const daysSinceDelivery = Math.floor(
            (Date.now() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceDelivery > 7) {
            return res.status(400).json({
                success: false,
                message: 'Return window has expired (7 days from delivery)'
            });
        }

        // Update return status for the item
        item.return = {
            isReturnRequested: true,
            reason: reason,
            requestDate: new Date(),
            status: 'pending',
            adminComment: null,
            isReturnAccepted: false
        };

        // Update item status and add to history
        item.order.status = 'refund processing';
        item.order.statusHistory.push({
            status: 'refund processing',
            date: new Date(),
            comment: `Return requested: ${reason}`
        });

        // Update payment status if payment was made
        if (['wallet', 'online', 'razorpay'].includes(order.payment.method) && 
            order.payment.paymentStatus === 'completed') {
            order.payment.paymentStatus = 'refund processing';
        }

        await order.save();

        res.json({
            success: true,
            message: 'Return request submitted successfully'
        });

    } catch (error) {
        console.error('Return request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit return request'
        });
    }
}

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user;

        // Find order and populate product details
        const order = await orderSchema.findOne({ _id: orderId, userId })
            .populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check stock availability for all items
        const stockCheck = await Promise.all(order.items.map(async (item) => {
            const product = await productSchema.findById(item.product._id);
            if (!product || product.stock < item.quantity) {
                return {
                    productName: item.product.productName,
                    available: false,
                    requiredQuantity: item.quantity,
                    currentStock: product ? product.stock : 0
                };
            }
            return { available: true };
        }));

        // Check if any product is out of stock
        const outOfStockItems = stockCheck.filter(item => !item.available);
        if (outOfStockItems.length > 0) {
            const errorMessages = outOfStockItems.map(item => 
                `${item.productName} - Required: ${item.requiredQuantity}, Available: ${item.currentStock}`
            );
            
            return res.status(400).json({
                success: false,
                message: 'Some items are out of stock',
                details: errorMessages.join('\n')
            });
        }

        // If all items are in stock, proceed with payment
        const options = {
            amount: order.totalAmount * 100,
            currency: "INR",
            receipt: orderId,
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Get user details for prefill
        const user = await userSchema.findById(userId);

        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            order: razorpayOrder,
            orderDetails: {
                name: user.name,
                email: user.email,
                contact: user.mobile
            }
        });

    } catch (error) {
        console.error('Retry payment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to initiate payment'
        });
    }
};

const verifyRetryPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            orderId 
        } = req.body;

        const order = await orderSchema.findById(orderId).populate('items.product');
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Verify Razorpay signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            // Update order status to failed if signature verification fails
            await orderSchema.findByIdAndUpdate(orderId, {
                'payment.paymentStatus': 'failed',
                $push: {
                    'items.$[].order.statusHistory': {
                        status: 'pending',
                        date: new Date(),
                        comment: 'Payment verification failed'
                    }
                }
            });

            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Update product stock for each item in the order
        for (const item of order.items) {
            await productSchema.findByIdAndUpdate(
                item.product._id,
                { $inc: { stock: -item.quantity } }
            );
        }

        // Update order with successful payment
        await orderSchema.findByIdAndUpdate(orderId, {
            'payment.paymentStatus': 'completed',
            'payment.razorpayTransaction': {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature
            },
            'items.$[].order.status': 'processing',
            $push: {
                'items.$[].order.statusHistory': {
                    status: 'processing',
                    date: new Date(),
                    comment: 'Payment successful, order processing'
                }
            }
        });

        res.json({
            success: true,
            message: 'Payment verified successfully'
        });

    } catch (error) {
        console.error('Verify retry payment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify payment'
        });
    }
};

export default { getOrders, cancelOrder, requestReturnItem, retryPayment, verifyRetryPayment };