const jwt = require('jsonwebtoken');
const responseMessages = require('../util/responseMessages');
const handleError = require('../util/handleError');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        const tokenString = token.replace('Bearer ', '');
        jwt.verify(tokenString, 'pharmacy', (err, decodedToken) => {
            if (err) {
                return handleError({res, status: 401, message:responseMessages.tokenExpired, error: err, responseCode:1001});
            } else {
                req.token = tokenString;
                req.decodedToken = decodedToken;
                next();
            }
        });
    } else {
        return handleError({
            res,
            status: 401,
            message: responseMessages.tokenNotProvided,
            responseCode:1001
        });
    }

}
module.exports = verifyToken;