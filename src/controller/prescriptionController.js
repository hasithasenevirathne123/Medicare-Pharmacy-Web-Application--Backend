const { PrismaClient } = require('@prisma/client');
const handleResponse = require('../util/handleResponse');
const handleError = require('../util/handleError')
const responseMessages = require('../util/responseMessages');
const path = require('path');
const bcrypt = require("bcryptjs");
const fs = require('fs');
const { all } = require('axios');
const { date } = require('joi');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const prisma = new PrismaClient();

const { root, createToken, refreshToken, sendEmail } = require('../../const');

const { pid } = require('process');

const fileUpload = async (req, res) => {

    try {
        if (!req.files || req.files.length === 0) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.fileUploadError,
                error: null,
                responseCode: 1001
            });
        }

        const filenames = req.files.map((file) => file.filename);
        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.fileUploadSuccess,
            data: { filenames: filenames },
            responseCode: 1000
        });
    } catch (error) {
        handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error,

            responseCode: 1001
        });
    }
};


const uploadPrescription = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001,
        });
    }

    const { customerId, frequency, fulfilment, substitutes, prescriptionItem, file, paymentMethod, refund, shippingAddress } = req.body;

    try {

        const existingCustomer = await prisma.customer.findUnique({
            where: {
                id: customerId,
                is_active: true
            }
        });

        if (!existingCustomer) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.customerNotExist,
                error: null,
                responseCode: 1001
            })
        }
        const createPrescription = await prisma.prescription.create({
            data: {
                frequency: frequency,
                fulfilment: fulfilment,
                substitutes: substitutes,
                prescription_item: prescriptionItem,
                image: file,
                payment_method: paymentMethod,
                refund: refund,
                shipping_address: shippingAddress,
                status: "Pending",
                customer: {
                    connect: {
                        id: customerId
                    }
                }
            }
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.prescriptionAdded,
            data: {
                createPrescription: createPrescription
            },
            responseCode: 1000
        })

    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.message,
        })
    }
}

const getUserPrescription = async (req,res)=>{
    const customerId = parseInt(req.params.customerId);

    try{

        const existingCustomer = await prisma.customer.findUnique({
            where: {
                id: customerId,
                is_active: true
            }
        });

        if(!existingCustomer){
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.customerNotExist,
                error: null,
                responseCode: 1001
            })
        }

        const prescription = await prisma.prescription.findMany({
            where:{
                customer_id:customerId,
                is_active:true
            },
            select:{
                id:true,
                frequency:true,
                fulfilment:true,
                substitutes:true,
                prescription_item:true,
                image:true,
                payment_method:true,
                refund:true,
                shipping_address:true,
                status:true
            }
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.prescriptionFetched,
            data: {
                prescription: prescription
            },
            responseCode: 1000
        })

    }catch(error){
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.message,
            responseCode: 1001
        })
    }
}

module.exports = {
    fileUpload,
    uploadPrescription,
    getUserPrescription
}