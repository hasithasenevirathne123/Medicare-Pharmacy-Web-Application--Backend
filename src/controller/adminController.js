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

const rootDir = `${root}/${process.env.ADMIN_IMAGES}`

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

const addNewUserType = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001
        });
    }

    const { userType } = req.body;


    try {
        const existingUserType = await prisma.user_type.findFirst({
            where: {
                name: userType
            }
        });

        if (existingUserType) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.userTypeExists,
                error: null,
                responseCode: 1001
            })
        }


        const newUserType = await prisma.user_type.create({
            data: {
                name: userType
            }
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.userTypeAdded,
            data: { newUserType: newUserType },
            responseCode: 1000
        })



    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }

}

const addNewProduct = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001
        });
    }

    const { productName, categoryId, file, quantity, price, description, brand, rating } = req.body;

    try {
        const existingProduct = await prisma.product.findFirst({
            where: {
                AND: [
                    { brand: brand },
                    { product_name: productName },
                    { category_id: categoryId },
                    { price: price }
                ]
            }
        })
        let updateProduct;
        let newProduct;
        if (existingProduct) {
            updateProduct = await prisma.product.update({
                where: {
                    id: existingProduct.id
                },
                data: {
                    image: file,
                    stock: existingProduct.stock + quantity,
                    description: description,
                    rating: rating
                }
            })
        } else {
            newProduct = await prisma.product.create({
                data: {
                    product_name: productName,
                    brand: brand,
                    category: {
                        connect: {
                            id: categoryId
                        }
                    },
                    image: file,
                    stock: quantity,
                    price: price,
                    description: description,
                    rating: rating
                }

            })
        }
        if (newProduct) {
            return handleResponse({
                res: res,
                status: 200,
                message: responseMessages.productAdded,
                data: {
                    newProduct: newProduct,
                },
                responseCode: 1000
            })
        } if (updateProduct) {
            return handleResponse({
                res: res,
                status: 200,
                message: responseMessages.productUpdated,
                data: {
                    updateProduct: updateProduct,
                },
                responseCode: 1000
            })
        }



    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }
}

const addCategory = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001
        });
    }

    const { category, file } = req.body;
    try {
        const existingCategory = await prisma.category.findFirst({
            where: {
                category_name: category
            }
        });

        if (existingCategory) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.categoryExists,
                error: null,
                responseCode: 1001
            })
        }

        const newCategory = await prisma.category.create({
            data: {
                category_name: category,
                image: file,

            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.categoryAdded,
            data: {
                newCategory: newCategory,
            },
            responseCode: 1000
        })

    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }

}


const getDetailsToAdminDashboard = async (req, res) => {
    const adminId = parseInt(req.params.adminId);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);


    // Dates for last month
    const startOfLastMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth() - 1, 1);
    const endOfLastMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);


    try {
        const existingAdmin = await prisma.admin.findFirst({
            where: {
                id: adminId,
                is_active: true
            }
        });

        if (!existingAdmin) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.adminNotFound,
                error: null,
                responseCode: 1001
            })
        }

        const adminDetails = await prisma.admin.findFirst({
            where: {
                id: adminId
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                mobile_number: true,
                street_address: true,
                city: true,
                gender: true,
                nic: true,
                image: true,
                user: {
                    select: {
                        email: true
                    }
                }
            }
        })

        const allCustomers = await prisma.customer.count({
            where: {
                is_active: true
            }
        })

        const allCategories = await prisma.category.count({
            where: {
                is_active: true
            }
        })

        const todayOrdersCount = await prisma.order.count({
            where: {
                created_at: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                is_active: true,
            },
        });


        const pendingOrdersCount = await prisma.order.count({
            where: {
                order_status: 'Pending',
                is_active: true,
            },
        });



        const todayIncome = await prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                created_at: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                is_active: true,
            },
        });

        const lastMonthIncome = await prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                created_at: {
                    gte: startOfLastMonth,
                    lte: endOfLastMonth,
                },
                is_active: true,
            },
        });

        const receivedIncome = await prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: 'Success',
                is_active: true,
            },
        });

        const pendingIncome = await prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: {
                    not: 'Success',
                },
                is_active: true,
            },
        });


        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.adminDetails,
            data: {
                adminDetails: adminDetails,
                allCustomers: allCustomers,
                allCategories: allCategories,
                todayOrdersCount: todayOrdersCount,
                pendingOrdersCount: pendingOrdersCount,
                todayIncome: parseInt(todayIncome._sum.amount) || 0,
                lastMonthIncome: parseInt(lastMonthIncome._sum.amount) || 0,
                receivedIncome: parseInt(receivedIncome._sum.amount) || 0,
                pendingIncome: parseInt(pendingIncome._sum.amount) || 0,
            },
            responseCode: 1000
        })

    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }
}


const getALLOrders = async (req, res) => {
    try {
        const allOrders = await prisma.order.findMany({
            where: {
                is_active: true
            },
            select: {
                id: true,
                customer: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        mobile_number: true,
                        street_address: true,
                        city: true,
                        gender: true,
                        nic: true,
                        image: true,
                        user: {
                            select: {
                                email: true
                            }
                        }
                    }
                },
                order_status: true,


            }
        })

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.allOrders,
            data: {
                allOrders: allOrders,
            },
            responseCode: 1000
        })

    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }
}


const changeOrderStatus = async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const orderStatus = req.body.orderStatus;
    try {
        const existingOrder = await prisma.order.findFirst({
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
                responseCode: 1001
            })
        }

        const updateOrder = await prisma.order.update({
            where: {
                id: orderId
            },
            data: {
                order_status: orderStatus
            }
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.orderUpdated,
            data: {
                updateOrder: updateOrder
            },
            responseCode: 1000
        })

    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }

}


const getAllCustomers = async (req, res) => {
    try {
        const allCustomers = await prisma.customer.findMany({
            select: {
                id: true,
                first_name: true,
                last_name: true,
                mobile_number: true,
                street_address: true,
                city: true,
                gender: true,
                nic: true,
                image: true,
                user: {
                    select: {
                        email: true
                    }
                }
            }
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.allCustomers,
            data: {
                allCustomers: allCustomers,
            },
            responseCode: 1000
        })

    } catch (error) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error.stack,
            responseCode: 1001
        })
    }
}

const updateAdmin = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001
        });
    }
    const adminId = parseInt(req.params.adminId);
    const { first_name, last_name, mobile_number, email, street_address, city, nic, gender } = req.body

    try {
        const existingAdmin = await prisma.admin.findUnique({
            where: {
                id: adminId,
                is_active: true
            }
        });
        if (!existingAdmin) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.adminNotFound,
                error: null,
                responseCode: 1001
            })
        }

        const dataToUpdate = {};
        if (first_name) dataToUpdate.first_name = first_name;
        if (last_name) dataToUpdate.last_name = last_name;
        if (mobile_number) {
            const existingMobileNumber = await prisma.admin.findFirst({
                where: {
                    mobile_number: mobile_number
                }
            })
            if (existingMobileNumber) {
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.phoneExists,
                    error: null,
                    responseCode: 1001
                })
            }

            dataToUpdate.mobile_number = mobile_number;
        }

        if (email) {
            const existingEmail = await prisma.user.findFirst({
                where: {
                    email: email,
                    id: {
                        not: existingAdmin.user_id
                    }
                }
            })
            if (existingEmail) {
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.EmailExists,
                    error: null,
                    responseCode: 1001
                })
            }

            const updateEmail = await prisma.user.update({
                where: {
                    id: existingAdmin.user_id
                },
                data: {
                    email: email
                }
            })
        }

        if (street_address) dataToUpdate.street_address = street_address;
        if (city) dataToUpdate.city = city;
        if (nic) {
            const existNic = await prisma.admin.findFirst({
                where: {
                    nic: nic,
                    id: {
                        not: existingAdmin.id
                    }
                }
            });

            if (existNic) {
                return handleError({
                    res: res,
                    status: 200,
                    message: responseMessages.nicExists,
                    error: null,
                    responseCode: 1001
                })
            }

            dataToUpdate.nic = nic;
        }

        if (gender) dataToUpdate.gender = gender;

        const updateAdmin = await prisma.admin.update({
            where: {
                id: adminId
            },
            data: dataToUpdate
        });

        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.customerUpdated,
            data: {
                admin: updateAdmin
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

module.exports = {
    addNewUserType,
    fileUpload,
    addNewProduct,
    addCategory,
    getDetailsToAdminDashboard,
    getALLOrders,
    changeOrderStatus,
    getAllCustomers,
    updateAdmin
}