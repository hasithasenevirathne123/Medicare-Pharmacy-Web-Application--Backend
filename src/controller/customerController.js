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


const rootDir = `${root}/${process.env.USER_IMAGES}`

const getDashboardDetails = async (req, res) => {
    const customerId = parseInt(req.params.customerId);

    try {
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                id: customerId
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

        const customerDetails = await prisma.customer.findFirst({
            where: {
                id: customerId
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                user: {
                    select: {
                        email: true
                    }
                },
                mobile_number: true,
                street_address: true,
                city: true,
                gender: true,
                nic: true,
                image: true,

            }


        });
        if (customerDetails.user) {
            customerDetails.email = customerDetails.user.email;
            delete customerDetails.user;
        }

        const categoryDetails = await prisma.category.findMany({
            select: {
                id: true,
                category_name: true,
                image: true,

            }
        })

        const allProducts = await prisma.product.findMany({
            select: {
                id: true,
                product_name: true,
                price: true,
                image: true,
                description: true,
                rating: true,
                stock: true,
                category: {
                    select: {
                        id: true,
                        category_name: true,
                        image: true
                    }
                }
            }
        })

        allProducts.forEach(product => {
            product.category_name = product.category.category_name;
            delete product.category;
            product.price = parseFloat(product.price)
            if (product.stock === 0) {
                product.avaliablity = "Out Of Stock"
            } else {
                product.avaliablity = "Avaliable"
            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.customerDetails,
            data: {
                customerDetails: customerDetails,
                categoryDetails: categoryDetails,
                allProducts: allProducts
            },
            responseCode: 1000
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


const getProductsOfCategory = async (req, res) => {
    const categoryId = parseInt(req.params.categoryId);
    try {
        const products = await prisma.product.findMany({
            where: {
                category_id: categoryId,
                is_active: true
            },
            select: {
                id: true,
                product_name: true,
                price: true,
                image: true,
                description: true,
                rating: true,
                stock: true,
                category: {
                    select: {
                        id: true,
                        category_name: true,
                        image: true
                    }
                }
            }
        })

        products.forEach(product => {
            product.category_name = product.category.category_name;
            delete product.category;
            product.price = parseFloat(product.price)
            if (product.stock === 0) {
                product.avaliablity = "Out Of Stock"
            } else {
                product.avaliablity = "Avaliable"
            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.customerDetails,
            data: {
                products: products
            },
            responseCode: 1000
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


const addToCart = async (req, res) => {
    const { customerId, productId, quantity } = req.body;

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

        const existingProduct = await prisma.product.findUnique({
            where: {
                id: productId,
                is_active: true
            }
        })

        if (!existingProduct) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.productNotExist,
                error: null,
                responseCode: 1001
            })
        }

        const cartItem = await prisma.cart.create({
            data: {
                customer: { connect: { id: customerId } },
                product: { connect: { id: productId } },
                quantity: quantity
            }
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.cartAdded,
            data: {
                cartItem: cartItem
            },
            responseCode: 1000
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

const showCartItems = async (req, res) => {
    const customerId = parseInt(req.params.customerId);
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

        const showCart = await prisma.cart.findMany({
            where: {
                customer_id: customerId,
                is_active: true
            },
            select: {
                id: true,
                customer_id: true,
                product_id: true,
                quantity: true,
                product: {
                    select: {
                        product_name: true,
                        brand: true,
                        description: true,
                        price: true,
                        image: true,
                        is_active: true,
                        rating: true,
                        stock: true,
                        category: {
                            select: {
                                id: true,
                                category_name: true,
                                image: true
                            }
                        }
                    }
                },
                created_at: true,
                is_active: true,


            }

        });

        let totalSum = 0.0;
        let tax = 0.0;
        let netSum = 0.0;
        
        let items = [];
        showCart.forEach(cart => {
            const itemTotal = parseFloat(cart.product.price) * cart.quantity;
            const itemTax = parseFloat(cart.product.price) * 0.10; // Assuming 10% tax

            totalSum += itemTotal;
            tax += itemTax;

            items.push({
                itemID:cart.id,
                item_name: cart.product.product_name,
                item_image: cart.product.image,
                item_price: cart.product.price,
                item_quantity: cart.quantity,
                item_total: itemTotal,
                item_tax: itemTax
            });
        });

        netSum = totalSum + tax;

      

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.customerDetails,
            data: {
                orderDetails: {
                    items: items,
                    sub_total: totalSum,
                    total_tax: tax,
                    net_total: netSum
                }
            },
            responseCode: 1000
        });
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

const updateCustomer = async (req,res)=>{
    const customerId = parseInt(req.params.customerId);
    const{first_name,last_name,mobile_number,email,street_address,city,nic,gender}=req.body

    try{
        const existingCustomer= await prisma.customer.findUnique({
            where:{
                id:customerId,
                is_active:true
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

        const dataToUpdate ={};
        if(first_name) dataToUpdate.first_name=first_name;
        if(last_name)dataToUpdate.last_name=last_name;
        if(mobile_number){
            const existingMobileNumber= await prisma.customer.findFirst({
                where:{
                    mobile_number:mobile_number
                }
            })
            if(existingMobileNumber){
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.phoneExists,
                    error: null,
                    responseCode: 1001
                })
            }

            dataToUpdate.mobile_number=mobile_number;
        }

        if(email){
            const existingEmail= await prisma.user.findFirst({
                where:{
                    email:email,
                    id:{
                        not:existingCustomer.user_id
                    }
                }
            })
            if(existingEmail){
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.EmailExists,
                    error: null,
                    responseCode: 1001
                })
            }

            const updateEmail = await prisma.user.update({
                where:{
                    id:existingCustomer.user_id
                },
                data:{
                    email:email
                }
            })
        }

        if(street_address)dataToUpdate.street_address=street_address;
        if(city)dataToUpdate.city=city;
        if(nic){
            const existNic = await prisma.customer.findFirst({
                where:{
                    nic:nic,
                    id:{
                        not:existingCustomer.id
                    }
                }
            });

            if(existNic){
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.nicExists,
                    error: null,
                    responseCode: 1001
                })
            }

            dataToUpdate.nic=nic;
        }

        if(gender)dataToUpdate.gender=gender;

        const updateCustomer = await prisma.customer.update({
            where:{
                id:customerId
            },
            data:dataToUpdate
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.customerUpdated,
            data: {
                customer: updateCustomer
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

const removeItemFromCart = async (req,res)=>{
    const cartId =parseInt(req.params.cartId);
    try{
        const existingCart = await prisma.cart.findUnique({
            where:{
                id:cartId,
                is_active:true
            }
        });

        if(!existingCart){
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.cartNotExist,
                error: null,
                responseCode: 1001
            })
        }

        const removeFromCart = await prisma.cart.update({
            where:{
                id:cartId
            },
            data:{
                is_active:false
            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.itemRemoved,
            data: {
                cartItem: removeFromCart
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
    getDashboardDetails,
    getProductsOfCategory,
    addToCart,
    showCartItems,
    updateCustomer,
    removeItemFromCart
}