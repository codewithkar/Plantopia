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



const router = express.Router();

router.get('/login',userMiddleware.isLogin,userverification.getLogin);
router.post('/login', userverification.postLogin);
router.get('/auth/google', userverification.getGoogle);
router.get('/auth/google/callback', userverification.getGoogleCallback);



//signup
router.get('/signup', userMiddleware.isLogin,userverification.getSignin);
router.post('/signup', userverification.postSignUp);
router.post('/validate-otp', userverification.postOtp);
router.post('/resend-otp',userverification.postResendOtp);
router.get('/auth/google',  userverification.getGoogle);
router.get('/auth/google/callback', userverification.getGoogleCallback);

//forgot password
router.get('/forgot-password', userMiddleware.isLogin, passwordController.forgotPassword);
router.post('/forgot-password/send-otp', passwordController.sendForgotPasswordOTP);
router.post('/forgot-password/verify-otp', passwordController.verifyForgotPasswordOTP);
router.post('/forgot-password/reset-password', passwordController.resetPassword);

//Home page
router.get('/', userHomeController.getHome);
router.get('/home', userMiddleware.checkSession,userHomeController.getHome);

//Shop
router.get('/shop', userMiddleware.checkSession,shopController.getShop);

//Product
router.get('/product/:id', userMiddleware.checkSession, productController.getProductDetails);

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
router.post('/cart/add', userMiddleware.checkSession, cartController.addToCart);
router.post('/cart/update-quantity', userMiddleware.checkSession, cartController.updateQuantity);
router.delete('/cart/remove/:productId', userMiddleware.checkSession,cartController.removeFromCart);

//checkout
router.get('/checkout', userMiddleware.checkSession,checkoutController.loadCheckoutPage);
router.post('/checkout/place-order', userMiddleware.checkSession, checkoutController.placeOrder);

//Orders
router.get('/orders', userMiddleware.checkSession, orderController.getOrders);
router.post('/orders/:orderId/cancel', userMiddleware.checkSession, orderController.cancelOrder);
router.post('/orders/:orderId/return', userMiddleware.checkSession, orderController.requestReturn);



router.get('/wishlist', userMiddleware.checkSession,wishListController.getwishList);

router.get('/orders', userMiddleware.checkSession,orderController.getOrders);
router.get('/wallet', userMiddleware.checkSession,walletController.getWallet);
router.get('/coupons', userMiddleware.checkSession,couponController.getCoupon);
router.get('/logout', userverification.getLogout);






export default router;