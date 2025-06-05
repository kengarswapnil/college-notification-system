const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/users/login');
};

// Middleware to check if user is a Student
exports.ensureStudent = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'student') {
    return next();
  }
  req.flash('error_msg', 'Please Login');
  res.redirect('/');
};

// Middleware to check if user is a Department Admin
exports.ensureDeptAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'deptAdmin') {
    return next();
  }
  req.flash('error_msg', 'You do not have permission to view this resource');
  res.redirect('/');
};

// Middleware to check if user is a Super Admin
exports.ensureSuperAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'superAdmin') {
    return next();
  }
  req.flash('error_msg', 'You do not have permission to view this resource');
  res.redirect('/');
};

// Middleware to check if user is either Department Admin or Super Admin
exports.ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'deptAdmin' || req.user.role === 'superAdmin')) {
    return next();
  }
  req.flash('error_msg', 'You do not have permission to view this resource');
  res.redirect('/');
};

// JWT Authentication middleware (alternative to session-based auth)
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};