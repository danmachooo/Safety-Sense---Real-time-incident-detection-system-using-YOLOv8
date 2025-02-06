const User = require('../models/Staffs/User');
const { ForbiddenError } = require('../utils/Error');

const adminMiddleware = async (req, res, next) =>  {
    try {
        const user =  await User.findByPk(req.user.userId);

        if(!user || user.role !== 'Admin') throw new ForbiddenError('Access denied: Admins only!');
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = adminMiddleware;