const Router = require('express');
const orderController = require('../controller/orderController');
const multer = require('multer');
const path = require('path');
const responseMessages = require('../util/responseMessages')
const verifyToken = require('../middleware/verifyToken')

const orderRoutes = Router();

orderRoutes.patch('/cart-update/:cartId',orderController.updateCartItem)
orderRoutes.post('/place-order',orderController.placeOrder)
orderRoutes.post('/plae-order-for-cart',orderController.placeOrderForCart)
orderRoutes.get('/get-user-orders/:customerId',orderController.getUserOrders)

module.exports = orderRoutes;