const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Welcome Page
router.get('/', (req, res) => {
  // If user is already logged in, redirect to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('welcome', {
    title: 'Welcome'
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, dashboardController.getDashboard);

module.exports = router;