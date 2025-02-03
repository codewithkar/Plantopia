import orderSchema from '../../models/order.js';
import userSchema from '../../models/users.js';
import productSchema from '../../models/product.js';
import Wallet from '../../models/wallet.js';

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

export default { getOrders, cancelOrder, requestReturnItem };