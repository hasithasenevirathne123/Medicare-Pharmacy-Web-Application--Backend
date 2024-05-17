const Router = require('express');
const userController = require("../controller/userController");

const userRoutes = Router();


userRoutes.post('/save-customer', userController.saveCustomer);
userRoutes.post('/login-user', userController.login);

userRoutes.post('/refresh-token', userController.verifyRefreshToken);

// userRoutes.post('/send-otp-to-user/:email', userController.sendForgotPasswordOTPToUser);
// userRoutes.post('/validate-otp',userController.validateOTP )
// userRoutes.patch('/change-password/:email',userController.changeUserPassword)

userRoutes.post('/save-admin',userController.saveAdmin)

// userRoutes.get('/get-all-otp',userController.getAllOtp)

module.exports = userRoutes;