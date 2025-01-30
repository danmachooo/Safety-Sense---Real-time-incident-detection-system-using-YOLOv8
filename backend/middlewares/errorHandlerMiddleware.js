const { makeError } = require("../utils/Error");

async function errorHandlerMiddleware(err, req, res, next) {
    const { error, statusCode } = makeError(err);
    console.error(error.message, error);
    return res.status(statusCode).json(error);
}

module.exports = errorHandlerMiddleware;
