const { PrismaClient } = require('@prisma/client');
const handleResponse = require('./src/util/handleResponse')
const handleError = require('./src/util/handleError')
const responseMessages = require('./src/util/responseMessages');
const path = require('path');
const bcrypt = require("bcryptjs");
const fs = require('fs');
const { all } = require('axios');
const { date } = require('joi');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const _filename = __dirname;


const maxAge = 2 * 24 * 60 * 60;
const refreshTokenAge = 3 * 24 * 60 * 60;

const createToken = (id, email) => {
    return jwt.sign({ id, email }, "pharmacy", {
        expiresIn: maxAge,
    });
};

const refreshToken = (id) => {
    return jwt.sign({ id }, "pharmacy refresh secret", {
        expiresIn: refreshTokenAge,
    });
};

const sendEmail = async (to, subject, html) => {
    
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "akiyaramsith2002@gmail.com",
            pass: "torb oask vzmy rkak",
        },

    });

    await transporter.sendMail({
        from: `golf@mobios.lk`,
        to,
        subject,
        html,
    });
};
module.exports = {
    root: _filename,
    createToken:createToken,
    refreshToken:refreshToken,
    sendEmail:sendEmail
};
