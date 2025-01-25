import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    orderCode: {
        type: String,
        unique: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    
    shippingAddress: {
        fullName: String,
        mobileNumber: Number,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: Number
    },
    payment: {
        method: {
            type: String,
            enum: ['cod', 'online', 'razorpay', 'wallet'],
            required: true
        },
        paymentStatus: {
            type: String,
            enum: ['pending','processing', 'completed', 'failed', 'refunded', 'cancelled', 'refund processing'],
            default: null
        },
    },
    order:{
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refund processing'],
            default: 'pending'
        },
        statusHistory: [{
            status: {
                type: String,
                enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 
                       'returned', 'refund processing', 'return requested'],
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            comment: String
        }]
    },
    return: {
        isReturnRequested: {
            type: Boolean,
            default: false
        },
        reason: {
            type: String,
            default: null
        },
        requestDate: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: null
        },
        adminComment: {
            type: String,
            default: null
        },
        isReturnAccepted: {
            type: Boolean,
            default: false
        }
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
}, {timestamps: true}
);

export default mongoose.model('Order', OrderSchema); 