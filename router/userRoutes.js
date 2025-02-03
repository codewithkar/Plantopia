import express from 'express';
import userverification from '../controller/user/userverification.js';
import userHomeController from '../controller/user/userHomeController.js';
import shopController from '../controller/user/shopController.js';
import wishListController from '../controller/user/wishListController.js';
import profileController from '../controller/user/profileController.js';
import cartController from '../controller/user/cartController.js';
import addressController from '../controller/user/addressController.js';
import orderController from '../controller/user/orderController.js';
import walletController from '../controller/user/walletController.js';
import couponController from '../controller/user/couponController.js';
import productController from '../controller/user/productController.js';
import passwordController from '../controller/user/passwordController.js';
import checkoutController from '../controller/user/checkoutController.js';
import userMiddleware from '../middlewares/userMiddleware.js';
import sendOtp from '../utils/sendOTP.js'



const router = express.Router();

router.get('/login',userMiddleware.isLogin,userverification.getLogin);
router.post('/login', userverification.postLogin);
router.get('/auth/google', userverification.getGoogle);
router.get('/auth/google/callback', userverification.getGoogleCallback);



//signup
router.get('/signup', userMiddleware.isLogin,userverification.getSignin);
router.get('/otp-verification',userMiddleware.isLogin, (req, res) => {
    res.render('user/signupOtp');
});
router.post('/signup', userverification.postSignUp);
// router.post('/handle-otp', userverification.handleOTP);
router.post('/validate-otp', userverification.postOtp);
router.post('/resend-otp',userverification.postResendOtp);
router.get('/auth/google',  userverification.getGoogle);
router.get('/auth/google/callback', userverification.getGoogleCallback);

//forgot password
router.get('/forgot-password', userMiddleware.isLogin, passwordController.forgotPassword);
router.post('/forgot-password/send-otp', sendOtp.otpValidation);
router.post('/forgot-password/verify-otp', passwordController.verifyForgotPasswordOTP);
router.post('/forgot-password/reset-password', passwordController.resetPassword);

//Home page
router.get('/', userHomeController.getHome);
router.get('/home', userHomeController.getHome);

//Shop
router.get('/shop', shopController.getShop);
// router.get('/shop/filtered', shopController.getFilteredProducts);
// router.get('/shop/search', shopController.searchProducts);


//Product
router.get('/product/:id', productController.getProductDetails);

//Profile
router.get('/profile', userMiddleware.checkSession,profileController.getProfile);
router.post('/profile/update', userMiddleware.checkSession, profileController.updateProfile);

//Address
router.get('/address', userMiddleware.checkSession,addressController.getAddress);
router.post('/address/add', userMiddleware.checkSession, addressController.addAddress);
router.delete('/address/:id', userMiddleware.checkSession, addressController.deleteAddress);
router.put('/address/:id', userMiddleware.checkSession, addressController.editAddress);

//Cart
router.get('/cart', userMiddleware.checkSession,cartController.getCart);
router.post('/cart/add', userMiddleware.checkCartSession, cartController.addToCart);
router.post('/cart/update-quantity', userMiddleware.checkSession, cartController.updateQuantity);
router.delete('/cart/remove/:productId', userMiddleware.checkSession,cartController.removeFromCart);

//checkout
router.get('/checkout', userMiddleware.checkSession,checkoutController.loadCheckoutPage);
router.post('/checkout/place-order', userMiddleware.checkSession, checkoutController.placeOrder);
router.post('/checkout/create-razorpay-order', userMiddleware.checkSession, checkoutController.createRazorpayOrder);
router.post('/checkout/verify-payment', userMiddleware.checkSession, checkoutController.verifyPayment);


router.post('/checkout/apply-coupon', userMiddleware.checkSession, checkoutController.applyCoupon);

router.post('/checkout/remove-coupon', userMiddleware.checkSession, checkoutController.removeCoupon);

router.get('/checkout/available-coupons', userMiddleware.checkSession, checkoutController.getAvailableCoupons);

//Orders
router.get('/orders', userMiddleware.checkSession, orderController.getOrders);
router.post('/orders/:orderId/cancel/:productId', userMiddleware.checkSession, orderController.cancelOrder);
router.post('/orders/:orderId/items/:productId/return', userMiddleware.checkSession, orderController.requestReturnItem);



router.get('/wishlist', userMiddleware.checkSession, wishListController.getWishlist);

router.post('/wishlist/add', userMiddleware.checkCartSession, wishListController.addToWishlist);

router.delete('/wishlist/remove/:productId', userMiddleware.checkSession, wishListController.removeFromWishlist);

router.get('/wishlist/check/:productId', userMiddleware.checkSession, wishListController.checkWishlistStatus);

router.get('/wallet', userMiddleware.checkSession, walletController.getWallet);

router.post('/wallet/add-funds', userMiddleware.checkSession, walletController.addFunds);


router.get('/wallet', userMiddleware.checkSession,walletController.getWallet);
router.get('/coupons', userMiddleware.checkSession,couponController.getCoupon);
router.get('/logout', userverification.getLogout);






export default router;