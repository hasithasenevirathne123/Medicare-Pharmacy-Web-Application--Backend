const Router = require('express');
const prescriptionController = require('../controller/prescriptionController');
const multer = require('multer');
const path = require('path');
const responseMessages = require('../util/responseMessages')
const verifyToken = require('../middleware/verifyToken')


const prescriptionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${process.env.PRESCRIPTIONS}`);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

const prescriptionUpload = multer({ storage: prescriptionStorage }).array('file');

const prescriptionRoutes = Router();

prescriptionRoutes.post('/save-prescription-file', (req, res, next) => {
    prescriptionUpload(req, res, function (err) {
        if (err) {
            return res.status(200).json({ message: responseMessages.ErrorUploadFiles, error: err.message,responseCode:1001,  });
        }
        next();
    });
}, prescriptionController.fileUpload);

prescriptionRoutes.post('/save-prescription',prescriptionController.uploadPrescription)
prescriptionRoutes.get('/get-user-prescription/:customerId',prescriptionController.getUserPrescription)


module.exports = prescriptionRoutes
