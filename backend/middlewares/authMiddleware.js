const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/Error');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')) 
        throw new UnauthorizedError('No token provided.');

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId }
        next();
    } catch(error) {
        throw new UnauthorizedError('Invalid or expired token');
    }
}

module.exports = authMiddleware