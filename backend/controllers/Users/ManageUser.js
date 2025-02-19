const { Op } = require('sequelize');
const User = require('../../models/Users/User');
const { BadRequestError, NotFoundError  } = require('../../utils/Error');
const { StatusCodes } = require('http-status-codes') ;
const bcrypt = require('bcryptjs');
const { get, search } = require('../../routes/InventoryRoutes');



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

const getUsers = async (req, res, next) => {
    try {
        let { search, role, page, limit, showDeleted } = req.query;

        const whereCondition = {};
        if (search) {
            whereCondition[Op.or] = [
                { firstname: { [Op.like]: `%${search}%` } },
                { lastname: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ];
        }

        if (role) whereCondition.role = role; 

        // Pagination handling
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        // Handle soft-deleted records
        const paranoidOption = showDeleted === 'true' ? false : true;

        const { count, rows } = await User.findAndCountAll({
            where: whereCondition,
            paranoid: paranoidOption,
            offset,
            limit: limitNumber,
        });

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Users retrieved successfully.",
            totalUsers: count,
            totalPages: Math.ceil(count / limitNumber),
            currentPage: pageNumber,
            data: rows,
        });

    } catch (error) {
        console.error("An error occurred: " + error);
        next(error);
    }
};


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

const softDeleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) throw new BadRequestError("User's ID is required.");

        const user = await User.findByPk(id);
        if (!user) throw new NotFoundError("User not found.");

        await user.destroy();  

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "User has been soft deleted."
        });
    } catch (error) {
        console.error("An error has occurred: " + error);
        next(error);
    }
};



const restoreUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) throw new BadRequestError("User's ID is required.");

        const user = await User.findOne({ where: { id }, paranoid: false });
        if (!user) throw new NotFoundError("User not found.");

        await user.restore(); // Restore soft deleted user

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "User has been restored."
        });
    } catch (error) {
        console.error("An error has occurred: " + error);
        next(error);
    }
};


// const searchUsers = async (req, res, next) => {
//     try {
//         const { query, role, page, limit } = req.query;

//         const whereCondition = {};
//         if (query) {
//             whereCondition[Op.or] = [
//                 { firstname: { [Op.like]: `%${query}%` } },
//                 { lastname: { [Op.like]: `%${query}%` } },
//                 { email: { [Op.like]: `%${query}%` } },
//             ];
//         }

//         if (role) whereCondition.role = role;

//         // Pagination handling
//         const pageNumber = parseInt(page) || 1;
//         const limitNumber = parseInt(limit) || 10;
//         const offset = (pageNumber - 1) * limitNumber;

//         const { count, rows } = await User.findAndCountAll({
//             where: whereCondition,
//             offset,
//             limit: limitNumber,
//         });

//         return res.status(StatusCodes.OK).json({
//             success: true,
//             message: "Users retrieved successfully.",
//             totalUsers: count,
//             totalPages: Math.ceil(count / limitNumber),
//             currentPage: pageNumber,
//             data: rows,
//         });

//     } catch (error) {
//         console.error("An error occurred: " + error);
//         next(error);
//     }
// };


const getDeletedUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({ where: { deletedAt: { [Op.ne]: null } }, paranoid: false });

        return res.status(StatusCodes.OK).json({
            success: true,
            users
        });
    } catch (error) {
        console.error('getDeletedUsers Function error: ' + error);
        next(error);
    }
}
module.exports = {
    getUser,
    getUsers,
    updateUser,
    softDeleteUser,
    restoreUser,
    
    getDeletedUsers
};