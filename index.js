require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const expressWinstom = require('express-winston');
const logger = require('./src/Logger/logger');
const verifyToken = require('./src/middleware/verifyToken');

const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const prescriptionRoutes = require('./src/routes/prescriptionRoutes');

const app = express();

const port = process.env.PORT || 4000

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use('/api/customer/get-customer-image',express.static(`${process.env.USER_IMAGES}`))
app.use('/api/admin/get-admin-image',express.static(`${process.env.ADMIN_IMAGES}`))
app.use('/api/product/get-product-image',express.static(`${process.env.PRODUCT_IMAGES}`))
app.use('/api/category/get-category-image',express.static(`${process.env.CATEGORY_IMAGES}`))
app.use('/api/prescription/get-prescription',express.static(`${process.env.PRESCRIPTIONS}`))

app.use(expressWinstom.logger({
    winstonInstance: logger,
    statusLevels: true
}))

app.use(morgan('dev'));
app.use("/api/admin",verifyToken,adminRoutes);
app.use("/api/user",userRoutes);
app.use("/api/customer",verifyToken,customerRoutes)
app.use("/api/order",verifyToken,orderRoutes)
app.use("/api/payment",verifyToken,paymentRoutes)
app.use("/api/prescription",verifyToken,prescriptionRoutes)

app.get("/", (req, res) => { res.send("Hello, world!") });

app.listen(port, () => {
    console.log(`Node.js on port ${port}!`)
});

module.exports = { app };