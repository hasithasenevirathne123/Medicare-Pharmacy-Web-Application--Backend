const Router = require('express');
const customerController = require('../controller/customerController');
const multer = require('multer');
const path = require('path');
const responseMessages = require('../util/responseMessages')
const verifyToken = require('../middleware/verifyToken')

const customerRoutes = Router();

customerRoutes.get('/get-dashboard-details/:customerId',customerController.getDashboardDetails);
customerRoutes.get('/get-product-of-category/:categoryId',customerController.getProductsOfCategory)
customerRoutes.post('/add-to-cart',customerController.addToCart)
customerRoutes.get('/get-cart-items/:customerId',customerController.showCartItems)
customerRoutes.patch('/update-customer/:customerId',customerController.updateCustomer)
customerRoutes.delete('/remove-from-cart/:cartId',customerController.removeItemFromCart)

module.exports = customerRoutes;