const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASSWORD 
    }
});

/**
 * Sends an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 */
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"SafetySense" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Failed to send email.');
    }
};

/**
 * Sends an email verification link
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.MOBILE_APP}/verify-email?token=${token}`;

    const htmlContent = `
        <h2>Email Verification</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationLink}" target="_blank">${verificationLink}</a>
        <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail(email, 'Verify Your Email', htmlContent);
};

/**
 * Sends a password reset link
 * @param {string} email - Recipient email
 * @param {string} token - Password reset token
 */
const sendPasswordResetEmail = async (email, token) => {
    const resetLink = `${process.env.MOBILE_APP}/reset-password?token=${token}`;

    const htmlContent = `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail(email, 'Reset Your Password', htmlContent);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
