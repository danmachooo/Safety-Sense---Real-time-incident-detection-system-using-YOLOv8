const { BadRequestError, NotFoundError, ForbiddenError  } = require('../../utils/Error');
const User = require('../../models/Staffs/User');
const jwt = require('jsonwebtoken');    
const bcrypt = require('bcryptjs');


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

        if(user.status === 'blocked') throw new ForbiddenError('User is blocked and cannot go any further.');
    
        const isMatch = await bcrypt.compare(password, user.password);
    
        if(!isMatch) throw new NotFoundError('User not found! Invalid credentials.');
    
        const token = jwt.sign({
            userId: user.id,
            status: user.status
        },
            JWT_SECRET, 
            {
                expiresIn: '1h'
            }        
        );
    
        return res.status(200).json({
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
        const { firstname, lastname, email, password } = req.body
    
        const existingUser = await User.findOne({
            where: {
                email
            }
        });
    
        if(existingUser) throw new BadRequestError('User already Exist!');
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            firstname,
            lastname,
            email,
            password: hashedPassword
        });
    
        if(!user) throw new BadRequestError('User has not been registered');
    
        return res.status(201).json({
            success: true,
            message: 'User has been registered!',
        });
    } catch (error) {
        console.error('An error occured');
        next(error);
    }
}

module.exports = {
    loginUser, 
    registerUser
}

