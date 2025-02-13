import orderSchema from '../../models/order.js';
import userSchema from '../../models/users.js';
import productSchema from '../../models/product.js';
import Wallet from '../../models/wallet.js'; 
import razorpay from '../../utils/razorpay.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit-table';

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

const generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user;

        const order = await orderSchema.findOne({ _id: orderId, userId })
            .populate('userId')
            .populate('items.product');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }


        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderCode}.pdf`);
        doc.pipe(res);

        // Generate separate invoice for each item
        order.items.forEach((item, index) => {
            if (index > 0) {
                doc.addPage();
            }

            // Calculate base prices and taxes
            const TAX_RATE = 0.18;
            const CGST_RATE = 0.09;
            const SGST_RATE = 0.09;

            // Pre-tax calculations
            const preTaxPrice = item.price / (1 + TAX_RATE);
            const preTaxTotal = preTaxPrice * item.quantity;
            
            // Tax calculations
            const cgstAmount = preTaxTotal * CGST_RATE;
            const sgstAmount = preTaxTotal * SGST_RATE;
            const totalTax = cgstAmount + sgstAmount;

            // Discount calculations (if applicable)
            const originalTotal = preTaxTotal + totalTax;
            const finalAmount = item.subtotal; // This is already the discounted total
            const totalDiscount = originalTotal - finalAmount;

            // Add header with company logo and tax invoice text
            doc.fontSize(20)
               .text('TAX INVOICE', { align: 'center' })
               .moveDown();

            // Add company details (left side)
            doc.fontSize(10)
               .text('Sold By:', 50)
               .font('Helvetica-Bold')
               .text('Plantopia')
               .font('Helvetica')
               .text('123 Nursary Street')
               .text('Kerala, India - 682001')
               .text('Phone: +91 9876543210')
               .text('Email: support@plantopia.com')
               .text('GSTIN: 32ABCDE1234F1Z5');

            // Add Invoice Details (right side)
            doc.fontSize(10)
               .text(`Invoice Number: ${order.orderCode}-${index + 1}`, 300, doc.y - 90)
               .text(`Order Date: ${new Date(order.orderDate).toLocaleDateString('en-IN')}`, 300)
               .text(`Invoice Date: ${new Date().toLocaleDateString('en-IN')}`, 300);

            // Add Billing Details
            doc.moveDown()
               .text('Billing Address:')
               .font('Helvetica-Bold')
               .text(`${order.shippingAddress.fullName}`)
               .font('Helvetica')
               .text(order.shippingAddress.addressLine1)
               .text(order.shippingAddress.addressLine2 || '')
               .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`)
               .text(`PIN: ${order.shippingAddress.pincode}`)
               .text(`Phone: ${order.shippingAddress.mobileNumber}`)
               .moveDown();

            // Product Details Table
            doc.font('Helvetica-Bold');
            const tableTop = doc.y + 20;

            // Table Headers
            doc.text('Product Details', 50, tableTop)
                .text('HSN', 200, tableTop)
                .text('Qty', 250, tableTop)
                .text('Pre-tax Rate', 300, tableTop)
                .text('Taxable Amount', 400, tableTop)
                .text('Total', 500, tableTop);

            // Underline
            doc.moveTo(50, tableTop + 15)
                .lineTo(550, tableTop + 15)
                .stroke();

            // Product Details
            doc.font('Helvetica')
                .text(item.product.productName, 50, tableTop + 30)
                .text('6203', 200, tableTop + 30)
                .text(item.quantity.toString(), 250, tableTop + 30)
                .text(`₹${preTaxPrice.toFixed(2)}`, 300, tableTop + 30)
                .text(`₹${preTaxTotal.toFixed(2)}`, 400, tableTop + 30)
                .text(`₹${originalTotal.toFixed(2)}`, 500, tableTop + 30);

            // Price Breakdown
            const summaryTop = tableTop + 80;
            doc.moveTo(50, summaryTop).lineTo(550, summaryTop).stroke()
                .font('Helvetica-Bold')
                .text('Price Breakdown', 50, summaryTop + 20)
                .font('Helvetica');

            // Detailed Summary
            let currentY = summaryTop + 40;
            
            // Pre-tax amount
            doc.text('Pre-tax Amount:', 350, currentY)
                .text(`₹${preTaxTotal.toFixed(2)}`, 500, currentY);
            currentY += 20;

            // Tax details
            doc.text('CGST @ 9%:', 350, currentY)
                .text(`₹${cgstAmount.toFixed(2)}`, 500, currentY);
            currentY += 20;

            doc.text('SGST @ 9%:', 350, currentY)
                .text(`₹${sgstAmount.toFixed(2)}`, 500, currentY);
            currentY += 20;

            // Subtotal after tax
            doc.text('Total (Inc. Tax):', 350, currentY)
                .text(`₹${originalTotal.toFixed(2)}`, 500, currentY);
            currentY += 20;

            // Discount (if applicable)
            if (totalDiscount > 0) {
                doc.text('Discount Applied:', 350, currentY)
                    .text(`-₹${totalDiscount.toFixed(2)}`, 500, currentY);
                currentY += 20;
            }

            // Final amount
            doc.moveTo(350, currentY).lineTo(550, currentY).stroke();
            currentY += 10;
            doc.font('Helvetica-Bold')
                .text('Final Amount:', 350, currentY)
                .text(`₹${finalAmount.toFixed(2)}`, 500, currentY);

            // Amount in words
            currentY += 40;
            doc.font('Helvetica')
                .text('Amount in Words:', 50, currentY)
                .text(`${numberToWords(Math.round(finalAmount))} Rupees Only`, 150, currentY);

            // Add Footer (within the page)
            const footerTop = doc.page.height - 120;
            
            // Footer Border Top
            doc.moveTo(50, footerTop).lineTo(550, footerTop).stroke();

            // Footer Content
            doc.fontSize(8)
               .font('Helvetica')
               .text('Terms & Conditions:', 50, footerTop + 10)
               .text('1. This is a computer generated invoice.', 50, footerTop + 25)
               .text('2. All disputes are subject to Kerala jurisdiction.', 50, footerTop + 35)
               .text('3. E. & O. E.', 50, footerTop + 45);

            // Company Details in Footer
            doc.fontSize(8)
               .text('Plantopia', 350, footerTop + 10)
               .text('123 nursary Street, Kerala - 682001', 350, footerTop + 25)
               .text('Email: support@plantopia.com | Phone: +91 9876543210', 350, footerTop + 35)
               .text('GSTIN: 32ABCDE1234F1Z5', 350, footerTop + 45);

            // Footer Border Bottom
            doc.moveTo(50, footerTop + 70).lineTo(550, footerTop + 70).stroke();

        });

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Generate invoice error:', error);
        res.status(500).json({ 
            message: 'Error generating invoice',
            error: error.message 
        });
    }
};

function numberToWords(number) {
    
    return number.toString(); 
}

export default { getOrders, cancelOrder, requestReturnItem, retryPayment, verifyRetryPayment, generateInvoice };