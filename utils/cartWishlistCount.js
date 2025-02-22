import cartSchema from '../models/cart.js';
import wishlistSchema from '../models/wishList.js';

const cartWishlistCountMiddleware = async (req, res, next) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            res.locals.cartCount = 0;
            res.locals.wishlistCount = 0;
            return next();
        }

        // Get cart count
        const cart = await cartSchema.findOne({ userId });
        res.locals.cartCount = cart ? cart.items.length : 0;

        // Get wishlist count
        const wishlist = await wishlistSchema.findOne({ userId });
        res.locals.wishlistCount = wishlist ? wishlist.items.length : 0;

        next();
    } catch (error) {
        console.error('Error in cartWishlistCount middleware:', error);
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;
        next();
    }
};

export default cartWishlistCountMiddleware;
