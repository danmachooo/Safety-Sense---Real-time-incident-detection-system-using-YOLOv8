// const { makeError } = require("../utils/Error");

import { makeError } from "../utils/Error.js";

async function errorHandlerMiddleware(err, req, res, next) {
  const { error, statusCode } = makeError(err);
  console.error(error.message, error);
  return res.status(statusCode).json(error);
}

export default errorHandlerMiddleware;
