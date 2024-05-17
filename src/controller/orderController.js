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


const updateCartItem = async (req, res) => {
    const cartId = parseInt(req.params.cartId);
    const { quantity } = req.body;


    try {
        const exsitingCart = await prisma.cart.findUnique({
            where: {
                id: cartId,
                is_active: true
            }
        });

        if (!exsitingCart) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.cartNotExist,
                error: null,
                responseCode: 1001
            })
        }

        const updateCart = await prisma.cart.update({
            where: {
                id: cartId,
                is_active: true
            },
            data: {
                quantity: quantity
            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.cartUpdated,
            responseCode: 1000,
            data: {
                updateCart: updateCart
            }
        })
    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.message,
            responseCode: 1001
        })
    }
}

const placeOrder = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001,
        });
    }

    const { customerId, productId, quantity } = req.body;

    try {
        await prisma.$transaction(async (prisma) => {
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

            const existingProduct = await prisma.product.findUnique({
                where: {
                    id: productId,
                    is_active: true
                }
            });

            if (!existingProduct) {
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.productNotExist,
                    error: null,
                    responseCode: 1001
                })
            }

            const createOrder = await prisma.order.create({
                data: {
                    customer: {
                        connect: {
                            id: customerId
                        }
                    },
                    order_status: "Pending",
                    date_receive: new Date(new Date().setDate(new Date().getDate() + 7))

                }
            });

            if (!createOrder.is_active) {
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.noContent,
                    error: null,
                    responseCode: 1001
                })
            }

            const createOrderDetail = await prisma.order_details.create({
                data: {
                    order: {
                        connect: {
                            id: createOrder.id
                        }
                    },
                    product: {
                        connect: {
                            id: productId
                        }
                    },
                    quantity: quantity,
                    price: parseFloat(existingProduct.price)
                }
            });

            const updateOrder = await prisma.order.update({
                where: {
                    id: createOrder.id,

                },
                data: {
                    amount: parseFloat(createOrderDetail.price) * parseFloat(createOrderDetail.quantity)
                }
            })

            let total = 0.0;
            let itemTax = 0.0;
            let tax = 0.0;
            let netTotal = 0.0;

            if (updateOrder) {

                total = parseFloat(updateOrder.amount) + total;

                itemTax = parseFloat(updateOrder.amount) * 10 / 100;
                tax = itemTax + tax;

            }

            netTotal = total + tax;


            const orderDetails = {
                items: [{
                    item_name: existingProduct.product_name,
                    item_image: existingProduct.image,
                    item_price: existingProduct.price,
                    item_quantity: createOrderDetail.quantity,
                    item_total: total,
                    item_tax: itemTax
                }],
                sub_total: total,
                total_tax: tax,
                net_total: netTotal
            };

            await prisma.order.update({
                where: {
                    id: createOrder.id
                },
                data: {
                    tax: orderDetails.total_tax,

                }
            })

            await prisma.order_details.update({
                where: {
                    id: createOrderDetail.id,
                    order_id: createOrder.id,
                    product_id: createOrderDetail.product_id
                },
                data: {
                    tax: orderDetails.total_tax
                }
            })


            handleResponse({
                res: res,
                status: 200,
                message: responseMessages.orderPlaced,
                responseCode: 1000,
                data: {
                    orderDetails: orderDetails,
                }
            })
        }, { interactiveTimeout: 10000 });
    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.message,
            responseCode: 1001
        })
    }
}

const placeOrderForCart = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001,
        });
    }

    const { customerId, cartItems } = req.body; // cartItems is an array of { productId, quantity }

    try {
        await prisma.$transaction(async (prisma) => {
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
                });
            }

            const createOrder = await prisma.order.create({
                data: {
                    customer: {
                        connect: {
                            id: customerId
                        }
                    },
                    order_status: "Pending",
                    date_receive: new Date(new Date().setDate(new Date().getDate() + 7))
                }
            });

            let total = 0.0;
            let totalTax = 0.0;
            let orderDetailsList = [];

            for (const item of cartItems) {
                const existingProduct = await prisma.product.findUnique({
                    where: {
                        id: item.productId,
                        is_active: true
                    }
                });

                if (!existingProduct) {
                    return handleError({
                        res: res,
                        status: 200,
                        message: responseMessages.productNotExist,
                        error: null,
                        responseCode: 1001
                    });
                }

                const createOrderDetail = await prisma.order_details.create({
                    data: {
                        order: {
                            connect: {
                                id: createOrder.id
                            }
                        },
                        product: {
                            connect: {
                                id: item.productId
                            }
                        },
                        quantity: item.quantity,
                        price: parseFloat(existingProduct.price)
                    }
                });

                const itemTotal = parseFloat(createOrderDetail.price) * parseFloat(createOrderDetail.quantity);
                const itemTax = itemTotal * 0.10; // Assuming 10% tax

                total += itemTotal;
                totalTax += itemTax;

                orderDetailsList.push({
                    item_name: existingProduct.product_name,
                    item_image: existingProduct.image,
                    item_price: existingProduct.price,
                    item_quantity: createOrderDetail.quantity,
                    item_total: itemTotal,
                    item_tax: itemTax
                });

                await prisma.order_details.update({
                    where: {
                        id: createOrderDetail.id
                    },
                    data: {
                        tax: itemTax
                    }
                });
            }

            const netTotal = total + totalTax;

            await prisma.order.update({
                where: {
                    id: createOrder.id
                },
                data: {
                    amount: netTotal,
                    tax: totalTax,

                }
            });

            const responseOrderDetails = {
                items: orderDetailsList,
                sub_total: total,
                total_tax: totalTax,
                net_total: netTotal
            };



            handleResponse({
                res: res,
                status: 200,
                message: responseMessages.orderPlaced,
                responseCode: 1000,
                data: {
                    orderDetails: responseOrderDetails,
                }
            });
        }, { interactiveTimeout: 10000 });
    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.message && error.stack,
            responseCode: 1001
        });
    }
};


const getUserOrders = async (req, res) => {
    const customerId = parseInt(req.params.customerId);

    try {
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

        const orders = await prisma.order.findMany({
            where:{
                customer_id:existingCustomer.id
            },
            select:{
                id:true,
                is_active:true,
                order_details:{
                    select:{
                        id:true,
                        price:true,
                        product:{
                            select:{
                                image:true,
                                product_name:true,
                                brand:true,
                                description:true,

                            }
                        },
                        quantity:true,
                        tax:true,
                        is_active:true,
                    }
                }
            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.ordersFetched,
            responseCode: 1000,
            data: {
                orders: orders
            }
        })

    } catch (error) {
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
    updateCartItem,
    placeOrder,
    placeOrderForCart,
    getUserOrders
}