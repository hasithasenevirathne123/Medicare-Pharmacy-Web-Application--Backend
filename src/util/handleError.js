function handleError({res, status, message,responseCode, error,data}) {
    res.status(status).json({
      message: message,
      responseCode:responseCode,
      error: error,
      data:data
    });
  }
  module.exports=handleError;