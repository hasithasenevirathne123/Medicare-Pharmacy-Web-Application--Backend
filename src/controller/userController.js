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

const { root,createToken,refreshToken,sendEmail } = require('../../const');

const rootDir = `${root}/${process.env.ADMIN_IMAGES}`

const fileUpload = async (req, res) => {

    try {
        if (!req.files || req.files.length === 0) {
            return handleError({
                res: res,
                status: 200,
                message: responseMessages.fileUploadError,
                error: null,
                responseCode:1001
            });
        }

        const filenames = req.files.map((file) => file.filename);
        handleResponse({
            res: res,
            status: 200,
            message: responseMessages.fileUploadSuccess,
            data: { filenames: filenames},
            responseCode:1000
        });
    } catch (error) {
        handleError({
            res: res,
            status: 200,
            message: responseMessages.serverError,
            error: error,
   
            responseCode:1001
        });
    }
};


const saveCustomer = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001,
        });
    }

    const {
        email,
        password,
        first_name,
        last_name,
        userTypeId,
        mobileNumber,
        nic,
        streetAddress,
        city,
        gender,
      
    } = req.body;

    let hashedPassword = null;
    if (password.length >= 8) {
        const salt = await bcrypt.genSalt();
        hashedPassword = await bcrypt.hash(password, salt);
    } else {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.minimumPasswordLength,
            error: null,
            data: { status: 1001 },
            responseCode: 1001,
        });
    }

    try {
        

        // Start the transaction
        await prisma.$transaction(async (prisma) => {
            const existingUser = await prisma.user.findUnique({ where: { email: email } });
            if (existingUser) {
                return handleError({ res: res, status: 200, message: responseMessages.userExists, error: null, data: { status: 1001 }, responseCode: 1001 });
            }

            if (mobileNumber) {
                const existingPhone = await prisma.customer.findFirst({
                    where: {
                        mobile_number: mobileNumber,

                    }
                })
                if (existingPhone) {
                    return handleError({
                        res: res,
                        status: 200,
                        message: responseMessages.phoneExists,
                        error: null,
                        responseCode: 1001,
                    })
                }
            }
            // Create user and student records
            const user = await prisma.user.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    user_type: { connect: { id: userTypeId } }
                }
            });
            const customer = await prisma.customer.create({
                data: {
                    mobile_number: mobileNumber,
                    street_address: streetAddress,
                    first_name: first_name,
                    last_name: last_name,
                    city:city,
                    gender:gender,
                    nic:nic,
                }
            });

            // Update student with user reference
            await prisma.customer.update({
                where: { id: customer.id },
                data: { user: { connect: { id: user.id } } }
            });

            const token = createToken(user.id, user.email);
            const refresh = refreshToken(user.id);

            user.password=undefined;
            // Send success response
            handleResponse({
                res: res,
                status: 200,
                message: responseMessages.registrationSuccess,
                responseCode: 1000,
                data: {
                    user:user,
                    customer:customer,
                    token,
                    refresh
                }
            });
        });
    } catch (error) {
        // Handle transaction error
        handleError({ res: res, status: 200, message: responseMessages.registrationFail, error: error.stack, responseCode: 1001 });
    }
};

const saveAdmin = async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.noContent,
            error: null,
            responseCode: 1001,
        });
    }

    const {
        email,
        password,
        first_name,
        last_name,
        userTypeId,
        mobileNumber,
        nic,
        streetAddress,
        city,
        gender,
      
    } = req.body;

    let hashedPassword = null;
    if (password.length >= 8) {
        const salt = await bcrypt.genSalt();
        hashedPassword = await bcrypt.hash(password, salt);
    } else {
        return handleError({
            res: res,
            status: 200,
            message: responseMessages.minimumPasswordLength,
            error: null,
            data: { status: 1001 },
            responseCode: 1001,
        });
    }

    try {
        

        // Start the transaction
        await prisma.$transaction(async (prisma) => {
            const existingUser = await prisma.user.findUnique({ where: { email: email } });
            if (existingUser) {
                return handleError({ res: res, status: 200, message: responseMessages.userExists, error: null, data: { status: 1001 }, responseCode: 1001 });
            }

            if (mobileNumber) {
                const existingPhone = await prisma.admin.findFirst({
                    where: {
                        mobile_number: mobileNumber,

                    }
                })
                if (existingPhone) {
                    return handleError({
                        res: res,
                        status: 200,
                        message: responseMessages.phoneExists,
                        error: null,
                        responseCode: 1001,
                    })
                }
            }
            // Create user and student records
            const user = await prisma.user.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    user_type: { connect: { id: userTypeId } }
                }
            });
            const admin = await prisma.admin.create({
                data: {
                    mobile_number: mobileNumber,
                    street_address: streetAddress,
                    first_name: first_name,
                    last_name: last_name,
                    city:city,
                    gender:gender,
                    nic:nic,
                }
            });

            // Update student with user reference
            await prisma.admin.update({
                where: { id: admin.id },
                data: { user: { connect: { id: user.id } } }
            });

            const token = createToken(user.id, user.email);
            const refresh = refreshToken(user.id);

            user.password=undefined;
            // Send success response
            handleResponse({
                res: res,
                status: 200,
                message: responseMessages.registrationSuccess,
                responseCode: 1000,
                data: {
                    user:user,
                    admin:admin,
                    token,
                    refresh
                }
            });
        });
    } catch (error) {
        // Handle transaction error
        handleError({ res: res, status: 200, message: responseMessages.registrationFail, error: error.stack, responseCode: 1001 });
    }
};


const login = async function (req, res) {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });


        if (user) {
            const auth = await bcrypt.compare(password, user.password);
            
            const token = createToken(user.id, user.email);

            const refresh = refreshToken(user.id);

            if (auth) {
                // res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
                if (user.user_type_id === 2) {
                    const customer = await prisma.customer.findFirst({
                        where: {
                            user: {
                                id: user.id
                            }
                        },
                    })

                    user.password=undefined;
                    return handleResponse({ res: res, status: 200, message: responseMessages.loginSuccess, responseCode: 1000, data: { user:user,  token, refresh, customer:customer } });
                } else if (user.user_type_id === 1) {
                    const admin = await prisma.admin.findFirst({
                        where: {
                            user: {
                                id: user.id
                            }
                        }
                    })
                    user.password=undefined;
                    return handleResponse({ res: res, status: 200, message: responseMessages.loginSuccess, responseCode: 1000, data: { user:user, token, refresh, admin:admin } });
                }

            }
            return handleError({ res: res, status: 200, message: responseMessages.loginPassswordFailed, error: null, responseCode: 1001 })
        }
        return handleError({ res: res, status: 200, message: responseMessages.loginUsernameFailed, error: null, responseCode: 1001 })
    }
    catch (err) {
        handleError({ res: res, status: 200, message: responseMessages.loginFailed, error: err.stack, responseCode: 1001 });

    }

};

const verifyRefreshToken = async (req, res) => {

    const token = req.headers.authorization;

    try {
        if (token) {
            const tokenString = token.replace('Bearer ', '');
            jwt.verify(tokenString, 'e-tutor refresh secret', async (err, decodedToken) => {
                if (err) {
                    return handleError({ res, status: 200, message: responseMessages.tokenExpired, error: err, data: { status: 1001 } });
                } else {
                    const userId = decodedToken.id;
                    const existingUser = await prisma.user.findUnique({
                        where: {
                            id: userId
                        },
                        select: {
                            email: true
                        }
                    });

                    const accessToken = createToken(userId, existingUser.email);
                    return handleResponse({ res, status: 200, message: responseMessages.success, data: { accessToken: accessToken } })

                }
            });
        } else {
            return handleError({
                res,
                status: 401,
                message: responseMessages.tokenNotProvided,
                responseCode: 1001,
                data: { status: 1001 }
            });
        }
    } catch (error) {
        return handleError({ res, status: 401, message: responseMessages.serverError, error: error.stack, responseCode: 1001 })
    }
}


module.exports = {
    fileUpload,
    saveCustomer,
    saveAdmin,
    login,
    verifyRefreshToken
}