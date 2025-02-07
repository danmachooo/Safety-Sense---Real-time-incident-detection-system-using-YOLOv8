const User = require('../../models/Staffs/User');
const { BadRequestError, NotFoundError  } = require('../../utils/Error');
const { StatusCodes } = require('http-status-codes') ;

const changeUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if(!id || !role) throw new BadRequestError("Invalid Request! Required fields are missing.");


        const user = await User.findByPk(id);

        if(!user) throw new NotFoundError('User not found.');

        const result = await user.update({
            role
        });

        if (!result || result.role !== role)  throw new Error('An error occurred. Cannot update user.');

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'User role has been updated!',
            data: { role: result.role }
        });
    } catch (error) {
        console.error('An error occurred while changing user role:', error);
        next(error);
    }
}

const changeAccess = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if(!id || !role) throw new BadRequestError("Invalid Request! Required fields are missing.");


        const user = await User.findByPk(id);

        if(!user) throw new NotFoundError('User not found.');

        const result = await user.update({
            status
        });

        if (!result || result.status !== status)  throw new Error('An error occurred. Cannot update user.');

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'User role has been updated!',
            data: { role: result.role }
        });
    } catch (error) {
        console.error('An error occurred while changing user role:', error);
        next(error);
    }
}


module.exports = changeUserRole