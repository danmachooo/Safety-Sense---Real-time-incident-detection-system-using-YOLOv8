const { BadRequestError, NotFoundError, ForbiddenError  } = require('../../utils/Error');
const User = require('../../models/Users/User');
const jwt = require('jsonwebtoken');    
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../services/emailService');
const { Op } = require('sequelize');
const { StatusCodes } = require('http-status-codes')

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}


const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if(!email || !password) throw new BadRequestError('Invalid email and password');
    
        const user = await User.findOne({
            where: {email}
        });
        
        if(!user) throw new NotFoundError('User not found! Invalid credentials.');

        if(user.isBlocked) throw new ForbiddenError('User is blocked and cannot go any further');

        if(!user.isVerified) throw new ForbiddenError('User is not yet verified and cannot go any further');
            
        const isMatch = await bcrypt.compare(password, user.password);
    
        if(!isMatch) throw new NotFoundError('User not found! Invalid credentials.');
    
        const token = jwt.sign({
            userId: user.id,
            role: user.role,
            isBlocked: user.isBlocked
        },
            JWT_SECRET, 
            {
                expiresIn: '1h'
            }        
        );
    
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'You are logged in!',
            data: {
                token: token,
                role: user.role
            }
        });
    } catch(error) {
        console.error('An error occured!');
        next(error);
    }
}

const registerUser = async (req, res, next) => {
    try {
        const { firstname, lastname, email, contactNumber, password } = req.body
    
        const existingUser = await User.findOne({
            where: {
                email
            }
        });
    
        if(existingUser) throw new BadRequestError('User already Exist!');
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        await User.create({
            firstname,
            lastname,
            email,
            contactNumber,
            password: hashedPassword,
            verificationToken
        });

        await sendVerificationEmail(email, verificationToken);
    
        return res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'User has been registered! Please verify your email',
        });
    } catch (error) {
        console.error('An error occured');
        next(error);
    }
}

const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) throw new BadRequestError("Invalid verification token.");

        const user = await User.findOne({ where: { verificationToken: token } });
        if (!user) throw new NotFoundError("Invalid or expired token.");

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Email verified successfully.",
        });
    } catch (error) {
        next(error);
    }
};

const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;
        console.log("EMAIL:", email)
        const user = await User.findOne({ where: { email } });

        if (!user) throw new NotFoundError("User not found.");

        // Generate reset token & expiration (1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = Date.now() + 3600000; // 1 hour from now

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetExpires;
        await user.save();

        // Send email
        await sendPasswordResetEmail(email, resetToken);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Password reset email sent.",
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }, // Check expiration
            }
        });

        if (!user) throw new BadRequestError("Invalid or expired token.");

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "Password reset successfully.",
        });
    } catch (error) {
        next(error);
    }
};



module.exports = {
    loginUser, 
    registerUser,
    verifyEmail,
    requestPasswordReset,
    resetPassword   
}

