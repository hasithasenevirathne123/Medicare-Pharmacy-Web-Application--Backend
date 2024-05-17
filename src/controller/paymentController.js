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

const buyNowPayment = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001,
        });
    }

    const { data, action } = req.body;

    const { customerId, orderId } = data;

    try {
        const existingCustomer = await prisma.customer.findUnique({
            where: {
                id: customerId,
                is_active: true
            }
        })

        if (!existingCustomer) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.customerNotExist,
                error: null,
                responseCode: 1001,
            });
        }

        const existingOrder = await prisma.order.findUnique({
            where: {
                id: orderId,
                is_active: true
            }
        });

        if (!existingOrder) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.orderNotExist,
                error: null,
                responseCode: 1001,
            })
        }


        const { data: additionalData } = req.body

        const payment = await prisma.payment.create({
            data: {
                data: JSON.stringify(additionalData),
                action: action,
                amount: existingOrder.amount,
                payment_method: "Card Payment",
                status :"Success"

            }
        })
        const dateReceive = new Date();
        dateReceive.setDate(dateReceive.getDate() + 7);
        await prisma.order.update({
            where: {
                id: existingOrder.id
            },
            data: {
                payment: {
                    connect: {
                        id: payment.id
                    }
                },
                date_receive: dateReceive
            }
        })

        const orderDetails = await prisma.order_details.findMany({
            where: {
                order_id: existingOrder.id,
                is_active: true
            },
            include: {
                order: true,
                product: true
            }
        });

        orderDetails.forEach(async (orderDetail) => {
            await prisma.product.update({
                where: {
                    id: orderDetail.product_id
                },
                data: {
                    stock: orderDetail.product.stock - orderDetail.quantity,
                    sold: orderDetail.quantity
                }
            })
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.paymentDone,
            data: {
                payment: payment
            },
            responseCode: 1000,
        })
    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.message,
            responseCode: 1001,
        })
    }

}


module.exports = {
    buyNowPayment
}