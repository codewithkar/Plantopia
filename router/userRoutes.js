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
router.get('/forgot-password', userverification.forgotPassword);

router.get('/auth/google',  userverification.getGoogle);
router.get('/auth/google/callback', userverification.getGoogleCallback);

//Home page
router.get('/', userHomeController.getHome);
router.get('/home', userMiddleware.checkSession,userHomeController.getHome);
router.get('/product/:id', userMiddleware.checkSession, productController.getProductDetails);


router.get('/shop', userMiddleware.checkSession,shopController.getShop);
router.get('/wishlist', userMiddleware.checkSession,wishListController.getwishList);
router.get('/profile', userMiddleware.checkSession,profileController.getProfile);
router.get('/cart', userMiddleware.checkSession,cartController.getCart);
router.get('/address', userMiddleware.checkSession,addressController.getAddress);
router.get('/orders', userMiddleware.checkSession,orderController.getOrders);
router.get('/wallet', userMiddleware.checkSession,walletController.getWallet);
router.get('/coupons', userMiddleware.checkSession,couponController.getCoupon);
router.get('/logout', userverification.getLogout);






export default router;