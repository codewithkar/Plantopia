import Product from '../../models/product.js';
import Wishlist from '../../models/wishList.js';

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;

        // Get wishlist with populated product details
        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName price imageUrl stock isActive'
        });

        res.render('user/wishlist', {
            wishlist: wishlist?.items || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).render('error', {
            message: 'Error loading wishlist',
            user: req.session.user
        });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId)
        const { productId } = req.body;
        console.log(productId)

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Check if product is already in wishlist
        const existingItem = wishlist.items.find(
            item => item.productId.toString() === productId
        );

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        // Add to wishlist
        wishlist.items.push({ productId });
        await wishlist.save();

        res.json({
            success: true,
            message: 'Product added to wishlist'
        });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to wishlist'
        });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.params;

        const result = await Wishlist.updateOne(
            { userId },
            { $pull: { items: { productId } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in wishlist'
            });
        }

        res.json({
            success: true,
            message: 'Product removed from wishlist'
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from wishlist'
        });
    }
};

const checkWishlistStatus = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.json({
                success: false,
                isInWishlist: false,
                message: 'User not logged in'
            });
        }

        const { productId } = req.params;
        const wishlist = await Wishlist.findOne({
            userId,
            'items.productId': productId
        });

        res.json({
            success: true,
            isInWishlist: !!wishlist
        });
    } catch (error) {
        console.error('Check wishlist status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking wishlist status'
        });
    }
};

export default { getWishlist, addToWishlist, removeFromWishlist, checkWishlistStatus }