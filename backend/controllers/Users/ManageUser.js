const User = require('../../models/Staffs/User');
const { get } = require('../../routes/AuthenticationRoutes');
const { BadRequestError, NotFoundError  } = require('../../utils/Error');
const { StatusCodes } = require('http-status-codes') ;


const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if(!id) throw new BadRequestError("Invalid Request! Required fields are missing.");

        const user = await User.findByPk(id);

        if(!user) throw new NotFoundError('User not found.');

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'User has been found.',
            data: user
        });

    } catch (error) {
        console.error('An error occured. '  + error);
        next(error);
    }
}

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll();

        if(!users) throw new NotFoundError('Users not found.');

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Users has been found.',
            data: users
        });

    } catch (error) {
        console.error('An error occured. '  + error);
        next(error);
    }
}

const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { firstname, lastname, newPassword, contactNumber } = req.body;

    if (!id) {
        throw new BadRequestError("User ID is required");
    }
    
    if (!firstname && !lastname && !newPassword && !contactNumber) {
        throw new BadRequestError("At least one field to update is required");
    }

    const updateData = { firstname, lastname, contactNumber };
    if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(newPassword, salt);
    }
    
    const [affectedCount] = await User.update(updateData, { where: { id } });

    if (affectedCount === 0) {
        throw new NotFoundError("User not found or no changes applied");
    }
   
    const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ['password'] }  
    });

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "User updated successfully",
        data: updatedUser
    });
};

module.exports = {
    getUser,
    getAllUsers
};