const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin, ensureSuperAdmin, ensureDeptAdmin, ensureStudent } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get All Notifications - Admin Only
router.get('/', ensureAdmin, notificationController.getNotifications);

// Get Student Notifications - Student Only
router.get('/student', ensureStudent, notificationController.getStudentNotifications);

// Add Notification Form - Admin Only
router.get('/add', ensureAdmin, async (req, res) => {
  try {
    // If dept admin, only show their department
    let departments;
    if (req.user.role === 'deptAdmin') {
      departments = await require('../models/Department').find({ _id: req.user.department });
    } else {
      departments = await require('../models/Department').find({}).sort({ name: 1 });
    }
    
    const categories = require('../models/Notification').schema.path('category').enumValues;
    
    res.render('notifications/add', {
      departments,
      categories,
      user: req.user,
      title: 'Add Notification'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/notifications');
  }
});

// Create Notification - Admin Only
router.post('/', ensureAdmin, notificationController.upload, notificationController.createNotification);

// Get Notification by ID - Admin Only
router.get('/:id', ensureAdmin, notificationController.getNotificationById);

// Update Notification - Admin Only
router.post('/:id', ensureAdmin, notificationController.upload, notificationController.updateNotification);

// Delete Notification - Admin Only
router.delete('/:id', ensureAdmin, notificationController.deleteNotification);

// View Notification Details - Admin Only
router.get('/:id/view', ensureAdmin, notificationController.viewNotification);

module.exports = router;