const Router = require('express');
const adminController = require('../controller/adminController');
const multer = require('multer');
const path = require('path');
const responseMessages = require('../util/responseMessages')
const verifyToken = require('../middleware/verifyToken')

const adminStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${process.env.ADMIN_IMAGES}`);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

const categoryImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${process.env.CATEGORY_IMAGES}`);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

const productImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${process.env.PRODUCT_IMAGES}`);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

const adminImageUpload = multer({ storage: adminStorage }).array('file');
const categoryImageUpload = multer({ storage: categoryImageStorage }).array('file');
const productImageUpload = multer({ storage: productImageStorage }).array('file');

const adminRoutes = Router();

adminRoutes.post('/add-new-user-type', adminController.addNewUserType)

adminRoutes.post('/save-admin-image', (req, res, next) => {
    adminImageUpload(req, res, function (err) {
        if (err) {
            return res.status(200).json({ message: responseMessages.ErrorUploadFiles, error: err.message,responseCode:1001,  });
        }
        next();
    });
}, adminController.fileUpload);

adminRoutes.post('/save-category-image', (req, res, next) => {
    categoryImageUpload(req, res, function (err) {
        if (err) {
            return res.status(200).json({ message: responseMessages.ErrorUploadFiles, error: err.message,responseCode:1001,  });
        }
        next();
    });
}, adminController.fileUpload);

adminRoutes.post('/save-product-image', (req, res, next) => {
    productImageUpload(req, res, function (err) {
        if (err) {
            return res.status(200).json({ message: responseMessages.ErrorUploadFiles, error: err.message,responseCode:1001,  });
        }
        next();
    });
}, adminController.fileUpload);


adminRoutes.post('/add-new-product',adminController.addNewProduct)
adminRoutes.post('/add-new-category',adminController.addCategory)


adminRoutes.get('/get-details-to-admin-dashboard/:adminId',adminController.getDetailsToAdminDashboard)
adminRoutes.get('/get-all-orders',adminController.getALLOrders)
adminRoutes.patch('/change-order-status/:orderId',adminController.changeOrderStatus)
adminRoutes.get('/get-all-customers',adminController.getAllCustomers)
adminRoutes.patch('/update-admin/:adminId',adminController.updateAdmin)

module.exports = adminRoutes; 