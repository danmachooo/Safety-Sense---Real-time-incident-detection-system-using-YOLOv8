import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Base email template with modern design
 * @param {string} title - Email title
 * @param {string} content - Main content HTML
 * @param {string} actionButton - Optional action button HTML
 */
const getEmailTemplate = (title, content, actionButton = "") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #374151;
                background-color: #f9fafb;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                margin-top: 40px;
                margin-bottom: 40px;
            }
            
            .header {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                padding: 40px 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            
            .logo {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
                position: relative;
                z-index: 1;
            }
            
            .logo-icon {
                width: 48px;
                height: 48px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .logo-text {
                font-size: 28px;
                font-weight: 800;
                color: white;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .header-title {
                font-size: 24px;
                font-weight: 700;
                color: white;
                margin: 0;
                position: relative;
                z-index: 1;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .content h2 {
                font-size: 28px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 16px;
                text-align: center;
            }
            
            .content p {
                font-size: 16px;
                color: #6b7280;
                margin-bottom: 24px;
                text-align: center;
                line-height: 1.7;
            }
            
            .action-button {
                display: inline-block;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 24px auto;
                display: block;
                max-width: 280px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            
            .action-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            }
            
            .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
                margin: 32px 0;
            }
            
            .footer {
                background-color: #f9fafb;
                padding: 32px 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            
            .footer p {
                font-size: 14px;
                color: #9ca3af;
                margin-bottom: 8px;
            }
            
            .footer-links {
                margin-top: 16px;
            }
            
            .footer-links a {
                color: #6b7280;
                text-decoration: none;
                font-size: 14px;
                margin: 0 12px;
                transition: color 0.3s ease;
            }
            
            .footer-links a:hover {
                color: #3b82f6;
            }
            
            .security-notice {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                margin: 24px 0;
                text-align: center;
            }
            
            .security-notice p {
                color: #92400e;
                font-size: 14px;
                margin: 0;
                font-weight: 500;
            }
            
            .status-badge {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin: 16px 0;
            }
            
            .status-active {
                background-color: #d1fae5;
                color: #065f46;
                border: 1px solid #10b981;
            }
            
            .status-blocked {
                background-color: #fee2e2;
                color: #991b1b;
                border: 1px solid #ef4444;
            }
            
            .role-badge {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
                margin: 16px 0;
            }
            
            @media (max-width: 600px) {
                .email-container {
                    margin: 20px;
                    border-radius: 12px;
                }
                
                .header, .content, .footer {
                    padding: 24px 20px;
                }
                
                .header-title {
                    font-size: 20px;
                }
                
                .content h2 {
                    font-size: 24px;
                }
                
                .action-button {
                    padding: 14px 24px;
                    font-size: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">
                        🛡️
                    </div>
                    <div class="logo-text">SafetySense</div>
                </div>
                <h1 class="header-title">${title}</h1>
            </div>
            
            <div class="content">
                ${content}
                ${actionButton}
            </div>
            
            <div class="footer">
                <p>© 2024 SafetySense. All rights reserved.</p>
                <p>This email was sent from a secure, monitored system.</p>
                <div class="footer-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">Contact Support</a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

/**
 * Sends an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"SafetySense Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send email.");
  }
};

/**
 * Sends an email verification link
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.MOBILE_APP}/verify-email?token=${token}`;

  const content = `
    <h2>🎉 Welcome to SafetySense!</h2>
    <p>Thank you for joining our safety management platform. To get started and secure your account, please verify your email address.</p>
    <p>Click the button below to complete your email verification:</p>
  `;

  const actionButton = `
    <a href="${verificationLink}" class="action-button">
      ✅ Verify Email Address
    </a>
    <div class="security-notice">
      <p>🔒 This verification link will expire in 24 hours for your security.</p>
    </div>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verificationLink}" style="color: #3b82f6; word-break: break-all;">${verificationLink}</a>
    </p>
  `;

  const htmlContent = getEmailTemplate(
    "Email Verification Required",
    content,
    actionButton
  );
  await sendEmail(email, "🛡️ Verify Your SafetySense Account", htmlContent);
};

/**
 * Sends a password reset link
 * @param {string} email - Recipient email
 * @param {string} token - Password reset token
 */
const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `${process.env.MOBILE_APP}/reset-password?token=${token}`;

  const content = `
    <h2>🔐 Password Reset Request</h2>
    <p>We received a request to reset your SafetySense account password. If you made this request, click the button below to create a new password.</p>
    <p>For your security, this link will expire in 1 hour.</p>
  `;

  const actionButton = `
    <a href="${resetLink}" class="action-button">
      🔑 Reset My Password
    </a>
    <div class="security-notice">
      <p>⚠️ If you didn't request this password reset, please ignore this email and contact our support team immediately.</p>
    </div>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #3b82f6; word-break: break-all;">${resetLink}</a>
    </p>
  `;

  const htmlContent = getEmailTemplate(
    "Password Reset Request",
    content,
    actionButton
  );
  await sendEmail(email, "🔐 Reset Your SafetySense Password", htmlContent);
};

/**
 * Sends a role change notification email
 * @param {string} email - Recipient email
 * @param {string} role - New role assigned
 */
const sendRoleChangeEmail = async (email, role) => {
  const content = `
    <h2>👤 Your Role Has Been Updated</h2>
    <p>Your account permissions have been modified by a system administrator.</p>
    <p>Your new role assignment:</p>
    <div style="text-align: center;">
      <span class="role-badge">🎯 ${role.toUpperCase()}</span>
    </div>
    <p>This change is effective immediately. You may need to log out and log back in to see your new permissions.</p>
  `;

  const actionButton = `
    <div class="security-notice">
      <p>📧 If you have questions about this role change, please contact your administrator or our support team.</p>
    </div>
  `;

  const htmlContent = getEmailTemplate(
    "Role Assignment Updated",
    content,
    actionButton
  );
  await sendEmail(
    email,
    "🎯 Your SafetySense Role Has Been Updated",
    htmlContent
  );
};

/**
 * Sends an account status change notification email
 * @param {string} email - Recipient email
 * @param {boolean} isBlocked - Whether the account is blocked or unblocked
 */
const sendAccountStatusEmail = async (email, isBlocked) => {
  const status = isBlocked ? "blocked" : "unblocked";
  const statusIcon = isBlocked ? "🚫" : "✅";
  const statusColor = isBlocked ? "status-blocked" : "status-active";

  const content = `
    <h2>${statusIcon} Account Status Update</h2>
    <p>Your SafetySense account status has been changed by a system administrator.</p>
    <div style="text-align: center;">
      <span class="status-badge ${statusColor}">
        ${statusIcon} Account ${status.toUpperCase()}
      </span>
    </div>
    <p>${
      isBlocked
        ? "Your account access has been temporarily restricted. Please contact support if you believe this is an error."
        : "Your account access has been restored. You can now log in and use all SafetySense features."
    }</p>
  `;

  const actionButton = isBlocked
    ? `
    <div class="security-notice">
      <p>🆘 Need help? Contact our support team for assistance with your account status.</p>
    </div>
  `
    : `
    <a href="${process.env.MOBILE_APP}/login" class="action-button">
      🚀 Access Your Account
    </a>
  `;

  const htmlContent = getEmailTemplate(
    "Account Status Changed",
    content,
    actionButton
  );
  await sendEmail(
    email,
    `${statusIcon} SafetySense Account ${isBlocked ? "Blocked" : "Unblocked"}`,
    htmlContent
  );
};

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountStatusEmail,
  sendRoleChangeEmail,
};
