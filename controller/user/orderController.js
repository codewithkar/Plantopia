import orderSchema from '../../models/order.js';
import userSchema from '../../models/users.js';
import productSchema from '../../models/product.js';

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

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user;

        const order = await orderSchema.findOne({ _id: orderId, userId })
            .populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!['pending', 'processing'].includes(order.order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        // Update product stock
        try {
            for (const item of order.items) {
                const product = await productSchema.findById(item.product._id);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        } catch (error) {
            console.error('Error updating product stock:', error);
            throw new Error('Failed to update product stock');
        }

        // Update order status
        order.order.status = 'cancelled';
        order.order.statusHistory.push({
            status: 'cancelled',
            date: new Date(),
            comment: 'Order cancelled by user'
        });

        // Process refund if payment was made
        if (['wallet', 'online', 'razorpay'].includes(order.payment.method) && 
            order.payment.paymentStatus === 'completed') {
            
            // Find or create wallet
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId, balance: 0 });
            }

            // Add refund to wallet
            wallet.balance += order.totalAmount;
            wallet.transactions.push({
                type: 'credit',
                amount: order.totalAmount,
                description: `Refund for cancelled order #${order._id}`,
                orderId: order._id,
                date: new Date()
            });

            await wallet.save();
            order.payment.paymentStatus = 'refunded';
        } else {
            order.payment.paymentStatus = 'cancelled';
        }

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error cancelling order'
        });
    }
}
const requestReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.session.user;

        const order = await orderSchema.findOne({ _id: orderId, userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Validate order status
        if (order.order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Only delivered orders can be returned'
            });
        }

        // Check if return is already requested
        if (order.return.isReturnRequested) {
            return res.status(400).json({
                success: false,
                message: 'Return already requested for this order'
            });
        }

        // Check return window (7 days)
        let deliveryDate;
        const deliveryStatus = order.order.statusHistory.find(h => h.status === 'delivered');
        
        if (deliveryStatus && deliveryStatus.date) {
            deliveryDate = deliveryStatus.date;
        } else {
            deliveryDate = order.updatedAt;
        }

        const daysSinceDelivery = Math.floor((Date.now() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24));
        if (daysSinceDelivery > 7) {
            return res.status(400).json({
                success: false,
                message: 'Return window has expired (7 days from delivery)'
            });
        }

        // Update order with return details
        order.return = {
            isReturnRequested: true,
            reason: reason,
            requestDate: new Date(),
            status: 'pending',
            adminComment: null,
            isReturnAccepted: false
        };

        // Add to status history
        order.order.statusHistory.push({
            status: 'return requested',
            date: new Date(),
            comment: `Return requested: ${reason}`
        });

        await order.save();

        res.json({
            success: true,
            message: 'Return request submitted successfully'
        });

    } catch (error) {
        console.error('Return request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error processing return request'
        });
    }
};

export default { getOrders, cancelOrder, requestReturn };