const { ForbiddenError } = require('../utils/Error');

const adminMiddleware = async (req, res, next) => {
    try {
        // Check if user data is available from the authMiddleware
        console.log(req.user || undefined)
        console.log(req.user.role || undefined)
        if (!req.user || !req.user.role) {
            throw new ForbiddenError('Access denied: No user information available.');
        }

        // Allow only admins 
        if (req.user.role !== 'admin') {
            throw new ForbiddenError('Access denied: Admins only!');
        }

        next(); // Proceed if user is an admin
    } catch (error) {
        console.error("Admin middleware error: " + error)
        next(error);
    }
};

module.exports = adminMiddleware;
