const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated, ensureAdmin, ensureSuperAdmin, ensureDeptAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Login Page
router.get('/login', (req, res) => {
  // If user is already logged in, redirect to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('users/login', {
    title: 'Login'
  });
});

// Forgot Password Page
router.get('/forgot-password', (req, res) => {
  res.render('users/forgot-password', {
    title: 'Forgot Password'
  });
});

// Reset Password Page
router.get('/reset-password/:token', (req, res) => {
  res.render('users/reset-password', {
    token: req.params.token,
    title: 'Reset Password'
  });
});

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Forgot Password Handle
router.post('/forgot-password', userController.forgotPassword);

// Reset Password Handle
router.post('/reset-password/:resettoken', userController.resetPassword);

// Logout Handle
router.get('/logout', userController.logoutUser);

// User Profile
router.get('/profile', ensureAuthenticated, userController.getUserProfile);

// Update User Profile
router.post('/profile', ensureAuthenticated, userController.updateUserProfile);

// Get All Users - Admin Only
router.get('/', ensureAdmin, userController.getUsers);

// Add User Form - Admin Only
router.get('/add', ensureAdmin, async (req, res) => {
  try {
    const departments = await require('../models/Department').find({}).sort({ name: 1 });
    
    res.render('users/add', {
      departments,
      title: 'Add User'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/users');
  }
});

// Register User - Admin Only
router.post('/register', ensureAdmin, userController.registerUser);

// Get User by ID - Admin Only
router.get('/:id', ensureAdmin, userController.getUserById);

// Update User - Admin Only
router.post('/:id', ensureAdmin, userController.updateUser);

// Delete User - Admin Only
router.delete('/:id', ensureAdmin, userController.deleteUser);

module.exports = router;