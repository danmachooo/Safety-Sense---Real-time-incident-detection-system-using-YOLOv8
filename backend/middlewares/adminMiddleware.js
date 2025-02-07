const User = require('../models/Staffs/User');
const { ForbiddenError } = require('../utils/Error');

const adminMiddleware = async (req, res, next) =>  {
    try {
        // Check if req.user exists
        if (!req.user || !req.user.id) {
            throw new ForbiddenError('Access denied: No user information available.');
        }

        // Retrieve the user from the database
        const user = await User.findByPk(req.user.id);

        // Check if the user exists and has the admin role
        if (!user || user.role !== 'admin') {
            throw new ForbiddenError('Access denied: Admins only!');
        }

        // User is authorized as admin, proceed to the next middleware
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = adminMiddleware;
