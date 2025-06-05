const User = require('../models/User');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
 
// @desc    Register user
// @route   POST /users/register
// @access  Private (Super Admin and Dept Admin only)
exports.registerUser = async (req, res) => {
  try {
    const { name, username, email, password, role, department } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      req.flash('error_msg', 'User already exists with that email or username');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Check if department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      req.flash('error_msg', 'Department not found');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Check if current user has permission to create this role
    if (req.user.role === 'deptAdmin' && role !== 'student') {
      req.flash('error_msg', 'Department Admin can only add students');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Check if department admin is adding user to their own department
    if (req.user.role === 'deptAdmin' && req.user.department.toString() !== department) {
      req.flash('error_msg', 'You can only add users to your own department');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Create user
    user = new User({
      name,
      username,
      email,
      password,
      role,
      department
    });

    await user.save();

    // Send welcome email with username and password
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const mailOptions = {
        from: `${process.env.EMAIL_FROM}`,
        to: user.email,
        subject: 'Welcome to the College Notification System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Welcome, ${user.name}!</h2>
            <p>Your account has been created in the College Notification System.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Username:</strong> ${user.username}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p>You can now log in using the above credentials.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">This is an automated email. Please do not reply.</p>
          </div>
        `
      };
      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error('Error sending welcome email:', emailErr);
      // Optionally, you can flash a warning but still proceed
    }

    req.flash('success_msg', 'User registered successfully');
    res.redirect(req.get('Referrer') || '/');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect(req.get('Referrer') || '/');
  }
};

// @desc    Login user
// @route   POST /users/login
// @access  Public
exports.loginUser = (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
};

// @desc    Logout user
// @route   GET /users/logout
// @access  Private
exports.logoutUser = (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
  });
};

// @desc    Get all users
// @route   GET /users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    let query = {};
    
    // If dept admin, only show users from their department
    if (req.user.role === 'deptAdmin') {
      query.department = req.user.department;
      query.role = 'student'; // Dept admins can only see students
    }
    
    // Filter by role if provided
    if (req.query.role && req.user.role === 'superAdmin') {
      query.role = req.query.role;
    }
    
    // Filter by department if provided
    if (req.query.department && req.user.role === 'superAdmin') {
      query.department = req.query.department;
    }

    // Search functionality
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get users with pagination
    const users = await User.find(query)
      .populate('department', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const departments = await Department.find({}).sort({ name: 1 });

    // Build pagination query string (excluding page)
    const { page: _, ...paginationQuery } = req.query;
    const queryString = Object.entries(paginationQuery)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const paginationQueryString = queryString ? `&${queryString}` : '';
    
    res.render('users/index', {
      users,
      departments,
      query: req.query,
      current: page,
      pages,
      paginationQuery: paginationQueryString,
      title: 'Users'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
};

// @desc    Get user by ID
// @route   GET /users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('department', 'name');
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/users');
    }
    
    // Check if dept admin is trying to view user from another department
    if (req.user.role === 'deptAdmin' && 
        user.department._id.toString() !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to view this user');
      return res.redirect('/users');
    }
    
    const departments = await Department.find({}).sort({ name: 1 });
    
    res.render('users/edit', {
      user,
      departments,
      currentUser: req.user,
      title: 'Edit User'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users');
  }
};

// @desc    Update user
// @route   PUT /users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, department, password, password2 } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/users');
    }
    
    // Check if dept admin is trying to update user from another department
    if (req.user.role === 'deptAdmin' && 
        user.department.toString() !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to update this user');
      return res.redirect('/users');
    }
    
    // Check if dept admin is trying to change role
    if (req.user.role === 'deptAdmin' && role !== 'student') {
      req.flash('error_msg', 'Department Admin can only manage students');
      return res.redirect('/users');
    }
    
    // Update user fields
    user.name = name;
    user.email = email;
    
    // Only super admin can change role and department
    if (req.user.role === 'superAdmin') {
      user.role = role;
      user.department = department;
    }
    
    // Handle password change if provided
    if (password && password.trim() !== '') {
      // Check if passwords match
      if (password !== password2) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect(`/users/${req.params.id}`);
      }
      
      // Update password
      user.password = password;
    }
    
    await user.save();
    
    req.flash('success_msg', 'User updated successfully');
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users');
  }
};

// @desc    Delete user
// @route   DELETE /users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/users');
    }
    
    // Check if dept admin is trying to delete user from another department
    if (req.user.role === 'deptAdmin' && 
        user.department.toString() !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to delete this user');
      return res.redirect('/users');
    }
    
    // Check if dept admin is trying to delete non-student
    if (req.user.role === 'deptAdmin' && user.role !== 'student') {
      req.flash('error_msg', 'Department Admin can only delete students');
      return res.redirect('/users');
    }
    
    await user.deleteOne();
    
    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users');
  }
};

// @desc    Forgot password
// @route   POST /users/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      req.flash('error_msg', 'User not found with that email');
      return res.redirect('/users/forgot-password');
    }
    
    // Get reset token
    const resetToken = user.getResetPasswordToken();
    
    await user.save({ validateBeforeSave: false });
    
    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/users/reset-password/${resetToken}`;
    
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the link below to reset your password: \n\n ${resetUrl}`;
    
    try {
      // Send email
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      await transporter.sendMail({
        from: `${process.env.EMAIL_FROM}`,
        to: user.email,
        subject: 'Password reset token',
        text: message
      });
      
      req.flash('success_msg', 'Email sent with password reset instructions');
      res.redirect('/users/login');
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      
      await user.save({ validateBeforeSave: false });
      
      req.flash('error_msg', 'Email could not be sent');
      res.redirect('/users/forgot-password');
    }
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users/forgot-password');
  }
};

// @desc    Reset password
// @route   PUT /users/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'Invalid or expired token');
      return res.redirect('/users/forgot-password');
    }
    
    // Check if passwords match
    if (req.body.password !== req.body.confirmPassword) {
      req.flash('error_msg', 'Passwords do not match');
      return res.redirect(`/users/reset-password/${req.params.resettoken}`);
    }
    
    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    req.flash('success_msg', 'Password updated successfully');
    res.redirect('/users/login');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users/forgot-password');
  }
};

// @desc    Get user profile
// @route   GET /users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('department', 'name');
    
    res.render('users/profile', {
      user,
      title: 'User Profile'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
};

// @desc    Update user profile
// @route   PUT /users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/dashboard');
    }
    
    // Update user fields
    user.name = name;
    user.email = email;
    
    await user.save();
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/users/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users/profile');
  }
};