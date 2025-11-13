const Invitation = require('../models/Invitation');
const User = require('../models/User');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const logger = new Logger('invitation-controller');

// Create email transporter
const createTransporter = () => {
  logger.info('Starting email transporter creation');
  
  // Validate required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const error = 'Email configuration is incomplete. Please check EMAIL_USER and EMAIL_PASS environment variables.';
    logger.error(error, {
      EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'MISSING',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'MISSING'
    });
    throw new Error(error);
  }

  logger.info('Email configuration values', {
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    user: process.env.EMAIL_USER ? 'SET' : 'MISSING'
  });

  try {
    // For testing, we'll use Gmail SMTP
    // In production, you might use other services like SendGrid, Mailgun, etc.
    const transporterConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // Set to true in production
      }
    };
    
    logger.info('Creating transporter with config', transporterConfig);
    const transporter = nodemailer.createTransporter(transporterConfig);
    logger.info('Transporter created successfully');
    
    // Verify the transporter configuration
    logger.info('Verifying transporter configuration');
    transporter.verify((error, success) => {
      if (error) {
        logger.error('Transporter verification failed', {
          error: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        });
      } else {
        logger.info('Transporter verification successful', { success });
      }
    });
    
    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall
    });
    throw new Error('Failed to create email transporter: ' + error.message);
  }
};

// Send invitation email
const sendInvitationEmail = async (email, invitationLink, role, invitedByName) => {
  logger.info('sendInvitationEmail called with parameters', { email, role, invitedByName });
  
  try {
    logger.info('Attempting to create email transporter', {
      EMAIL_SERVICE: process.env.EMAIL_SERVICE,
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE,
      EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'MISSING',
      EMAIL_FROM: process.env.EMAIL_FROM
    });

    const transporter = createTransporter();
    
    logger.info('Email transporter created successfully');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'You\'ve been invited to join Winnerforce Spark',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Winnerforce Spark Team Invitation</h2>
          <p>Hello,</p>
          <p>You've been invited to join Winnerforce Spark as a <strong>${role}</strong> by ${invitedByName}.</p>
          <p>Click the button below to accept the invitation and set up your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${invitationLink}</p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This email was sent from Winnerforce Spark. If you have any questions, please contact your administrator.
          </p>
        </div>
      `
    };

    logger.info('Sending email', { 
      to: email, 
      subject: mailOptions.subject,
      from: mailOptions.from
    });

    logger.info('About to call transporter.sendMail');
    const result = await transporter.sendMail(mailOptions);
    logger.info('Invitation email sent successfully', { 
      email, 
      messageId: result.messageId 
    });
    return result;
  } catch (error) {
    logger.error('Failed to send invitation email', { 
      email, 
      error: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      response: error.response,
      errno: error.errno,
      syscall: error.syscall
    });
    throw new Error('Failed to send invitation email: ' + error.message);
  }
};

// @desc    Invite a new team member
// @route   POST /api/invitations
// @access  Private/Admin
exports.inviteMember = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for inviteMember request');
    throw new APIError('Database not available', 503);
  }
  
  // Only ADMIN can invite members
  if (req.user.role !== 'ADMIN') {
    throw new APIError('Only ADMIN users can invite team members', 403);
  }
  
  const { email, role } = req.body;
  
  // Validate required fields
  if (!email) {
    throw new APIError('Please provide an email address', 400);
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new APIError('Please provide a valid email address', 400);
  }
  
  // Validate role
  const validRoles = ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'];
  if (role && !validRoles.includes(role)) {
    throw new APIError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`, 400);
  }
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new APIError('User with this email already exists', 400);
  }
  
  // Check if invitation already exists
  const existingInvitation = await Invitation.findOne({ email });
  if (existingInvitation && !existingInvitation.accepted && existingInvitation.expiresAt > new Date()) {
    throw new APIError('Invitation already sent to this email', 400);
  }
  
  // Generate invitation token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration (7 days from now)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Create invitation
  const invitation = await Invitation.create({
    email,
    role: role || 'CONTRIBUTOR',
    invitedBy: req.user.id,
    token,
    expiresAt
  });
  
  // Generate invitation link
  const invitationLink = `${req.protocol}://${req.get('host')}/accept-invitation?token=${token}`;
  
  logger.info('Team member invited successfully', { 
    email, 
    invitedBy: req.user.id,
    invitationId: invitation._id,
    invitationLink // Include the link in the logs for reference
  });
  
  // Return success response with invitation link
  res.status(201).json({
    success: true,
    message: 'Invitation created successfully. Share the link below with the recipient.',
    data: {
      invitationId: invitation._id,
      email: invitation.email,
      role: invitation.role,
      invitationLink,
      expiresAt: invitation.expiresAt
    }
  });
});

// @desc    Get invitation by token
// @route   GET /api/invitations/:token
// @access  Public
exports.getInvitation = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getInvitation request');
    throw new APIError('Database not available', 503);
  }
  
  const { token } = req.params;
  
  // Find invitation by token
  const invitation = await Invitation.findOne({ token });
  
  if (!invitation) {
    throw new APIError('Invalid invitation token', 400);
  }
  
  // Check if invitation has expired
  if (invitation.expiresAt < new Date()) {
    throw new APIError('Invitation has expired', 400);
  }
  
  // Check if invitation has already been accepted
  if (invitation.accepted) {
    throw new APIError('Invitation has already been accepted', 400);
  }
  
  logger.info('Invitation retrieved successfully', { 
    email: invitation.email,
    invitationId: invitation._id 
  });
  
  res.status(200).json({
    success: true,
    data: {
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt
    }
  });
});

// @desc    Accept invitation and create user account
// @route   POST /api/invitations/:token/accept
// @access  Public
exports.acceptInvitation = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for acceptInvitation request');
    throw new APIError('Database not available', 503);
  }
  
  const { token } = req.params;
  const { name, password } = req.body;
  
  // Validate required fields
  if (!name || !password) {
    throw new APIError('Please provide name and password', 400);
  }
  
  // Validate password strength
  if (password.length < 8) {
    throw new APIError('Password must be at least 8 characters long', 400);
  }
  
  // Find invitation by token
  const invitation = await Invitation.findOne({ token });
  
  if (!invitation) {
    throw new APIError('Invalid invitation token', 400);
  }
  
  // Check if invitation has expired
  if (invitation.expiresAt < new Date()) {
    throw new APIError('Invitation has expired', 400);
  }
  
  // Check if invitation has already been accepted
  if (invitation.accepted) {
    throw new APIError('Invitation has already been accepted', 400);
  }
  
  // Check if user already exists with this email
  const existingUser = await User.findOne({ email: invitation.email });
  if (existingUser) {
    throw new APIError('User with this email already exists', 400);
  }
  
  // Create user
  const user = await User.create({
    name,
    email: invitation.email,
    password,
    role: invitation.role
  });
  
  // Mark invitation as accepted
  invitation.accepted = true;
  invitation.acceptedAt = new Date();
  await invitation.save();
  
  logger.info('Invitation accepted and user created successfully', { 
    userId: user._id,
    email: user.email,
    invitationId: invitation._id 
  });
  
  res.status(201).json({
    success: true,
    message: 'Account created successfully. You can now log in.',
    data: {
      userId: user._id,
      email: user.email,
      name: user.name
    }
  });
});