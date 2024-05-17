const Router = require('express');
const paymentController = require('../controller/paymentController');
const multer = require('multer');
const path = require('path');
const responseMessages = require('../util/responseMessages')
const verifyToken = require('../middleware/verifyToken')

const paymentRoutes = Router();

paymentRoutes.post('/save-payment',paymentController.buyNowPayment)


module.exports = paymentRoutes;