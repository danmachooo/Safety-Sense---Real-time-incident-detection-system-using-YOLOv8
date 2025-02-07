const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/Error');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided.'));
  }

  const token = authHeader.split(' ')[1];
  console.log("TOKEN: ", token);
  console.log("JWT SECRET: ", process.env.JWT_SECRET);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED: ", decoded);

    if(decoded.status === "blocked")  next(new UnauthorizedError('User is blocked and cannot go any further.'));

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};


module.exports = authMiddleware;