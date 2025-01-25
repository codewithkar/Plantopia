import express from 'express';
import adminController from '../controller/admin/adminController.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';  // Add this import
import productController from '../controller/admin/productController.js';
import userController from '../controller/admin/adminUserController.js';
import categoryController from '../controller/admin/categoryController.js';
import orderController from '../controller/admin/orderController.js';
import offerController from '../controller/admin/offerController.js';
import couponController from '../controller/admin/couponController.js';
import salesReportController from '../controller/admin/salesReportController.js';

const router = express.Router();


router.get('/login',adminMiddleware.isLogin, adminController.getAdmin);
router.post('/login',adminController.postAdmin);
router.get('/dashboard', adminMiddleware.checkSession, adminController.getDashboard);


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


router.get('/offers',adminMiddleware.checkSession,offerController.getOfferList)
router.get('/coupon',adminMiddleware.checkSession,couponController.getCouponList)
router.get('/sales-report',adminMiddleware.checkSession,salesReportController.getReport)
router.get('/logout', adminMiddleware.checkSession, adminController.getLogout);

export default router;