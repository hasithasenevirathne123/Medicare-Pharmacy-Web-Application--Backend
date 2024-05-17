function handleResponse({res, status, message,responseCode, data}) {
    res.status(status).json({
        message: message,
        responseCode:responseCode,
        data: data,
    });
}

module.exports=handleResponse;