import express from 'express';
import adminController from '../controller/admin/adminController.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';  // Add this import
import productController from '../controller/admin/productController.js';
import userController from '../controller/admin/adminUserController.js';
import categoryController from '../controller/admin/categoryController.js';
import orderController from '../controller/admin/orderController.js';
import offerController from '../controller/admin/offerController.js';
import couponController from '../controller/admin/couponController.js';
import reportController from '../controller/admin/reportController.js';
import dashBoardController from '../controller/admin/dashBoardController.js';

const router = express.Router();


router.get('/login',adminMiddleware.isLogin, adminController.getAdmin);
router.post('/login',adminController.postAdmin);
router.get('/dashboard', adminMiddleware.checkSession, dashBoardController.getDashboard);
router.get('/dashboard/data', adminMiddleware.checkSession, dashBoardController.getDashboardData);

// Product Routes
router.get('/products',adminMiddleware.checkSession,productController.getProductPage)
router.post('/product/add', adminMiddleware.checkSession, productController.addProduct);
router.get('/product/:id', adminMiddleware.checkSession, productController.getProductDetails);
router.post('/product/edit/:id', adminMiddleware.checkSession, productController.updateProduct);
router.post('/product/toggle-status/:id', adminMiddleware.checkSession, productController.toggleProductStatus);



router.get('/userList',adminMiddleware.checkSession,userController.getUserList)
router.post('/user/:id/toggle-block', adminMiddleware.checkSession, userController.getToggle);





// Category Routes
router.get('/category',adminMiddleware.checkSession,categoryController.getCategory)
router.post('/category/add', adminMiddleware.checkSession, categoryController.addCategory);
router.post('/category/edit', adminMiddleware.checkSession, categoryController.editCategory);
router.get('/category/toggle', adminMiddleware.checkSession, categoryController.toggleCategory);
router.delete('/category/delete/?id', adminMiddleware.checkSession, categoryController.deleteCategory);


// order Routes
router.get('/orders',adminMiddleware.checkSession,orderController.getOrderList)
router.post('/orders/:orderId/status', adminMiddleware.checkSession, orderController.updateOrderStatus);
router.post('/orders/:orderId/items/:productId/status', adminMiddleware.checkSession, orderController.updateItemStatus);
router.post('/orders/:orderId/items/:productId/return', adminMiddleware.checkSession, orderController.handleReturnRequest);


// Coupon Routes
router.get('/coupon', adminMiddleware.checkSession, couponController.getCouponList);
router.post('/coupons/add', adminMiddleware.checkSession, couponController.addCoupon);
router.get('/coupons/:id', adminMiddleware.checkSession, couponController.getCouponDetails);
router.post('/coupons/edit/:id', adminMiddleware.checkSession, couponController.updateCoupon);
router.post('/coupons/delete/:id', adminMiddleware.checkSession, couponController.deleteCoupon);
router.post('/coupons/toggle-status/:id', adminMiddleware.checkSession, couponController.toggleCouponStatus);


router.get('/offers', adminMiddleware.checkSession, offerController.getOffers);
router.post('/offers', adminMiddleware.checkSession, offerController.createOffer);
router.get('/offers/:offerId', adminMiddleware.checkSession, offerController.getOffer);
router.put('/offers/:offerId', adminMiddleware.checkSession, offerController.updateOffer);
router.delete('/offers/:offerId', adminMiddleware.checkSession, offerController.deleteOffer);

router.get('/sales-report', adminMiddleware.checkSession, reportController.getSalesReport);

router.get('/sales-report/download-excel', adminMiddleware.checkSession, reportController.downloadExcel);

router.get('/sales-report/download-pdf', adminMiddleware.checkSession, reportController.downloadPDF); 
router.get('/logout', adminMiddleware.checkSession, adminController.getLogout);

export default router;