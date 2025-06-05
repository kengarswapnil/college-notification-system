const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');

// @desc    Get dashboard based on user role
// @route   GET /dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    // Redirect to appropriate dashboard based on user role
    switch (req.user.role) {
      case 'student':
        return await getStudentDashboard(req, res);
      case 'deptAdmin':
        return await getDeptAdminDashboard(req, res);
      case 'superAdmin':
        return await getSuperAdminDashboard(req, res);
      default:
        req.flash('error_msg', 'Invalid user role');
        return res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/');
  }
};

// Student Dashboard
async function getStudentDashboard(req, res) {
  try {
    // Get student's department
    const department = await Department.findById(req.user.department);
    
    // Get notification counts by category for student's department
    const categories = Notification.schema.path('category').enumValues;
    const notificationsByCategory = {};
    
    for (const category of categories) {
      const count = await Notification.countDocuments({
        department: req.user.department,
        category
      });
      
      notificationsByCategory[category] = count;
    }
    
    // Get total notifications for student's department
    const totalNotifications = await Notification.countDocuments({ department: req.user.department });
    
    // Get recent notifications
    const recentNotifications = await Notification.find({ department: req.user.department })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('dashboard/student', {
      user: req.user,
      department,
      notificationsByCategory,
      totalNotifications,
      recentNotifications,
      title: 'Student Dashboard'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/');
  }
}

// Department Admin Dashboard
async function getDeptAdminDashboard(req, res) {
  try {
    // Get department admin's department
    const department = await Department.findById(req.user.department);
    
    // Get student count in department
    const studentCount = await User.countDocuments({
      department: req.user.department,
      role: 'student'
    });
    
    // Get notification counts by category for department
    const categories = Notification.schema.path('category').enumValues;
    const notificationsByCategory = {};
    
    for (const category of categories) {
      const count = await Notification.countDocuments({
        department: req.user.department,
        category
      });
      
      notificationsByCategory[category] = count;
    }
    
    // Get total notifications for department
    const totalNotifications = await Notification.countDocuments({ department: req.user.department });
    
    // Get recent notifications
    const recentNotifications = await Notification.find({ department: req.user.department })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('dashboard/deptAdmin', {
      user: req.user,
      department,
      studentCount,
      notificationsByCategory,
      totalNotifications,
      recentNotifications,
      title: 'Department Admin Dashboard'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/');
  }
}

// Super Admin Dashboard
async function getSuperAdminDashboard(req, res) {
  try {
    // Get total counts
    const userCount = await User.countDocuments({});
    const departmentCount = await Department.countDocuments({});
    const notificationCount = await Notification.countDocuments({});
    
    // Get user counts by role
    const studentCount = await User.countDocuments({ role: 'student' });
    const deptAdminCount = await User.countDocuments({ role: 'deptAdmin' });
    const superAdminCount = await User.countDocuments({ role: 'superAdmin' });
    
    // Get notification counts by category
    const categories = Notification.schema.path('category').enumValues;
    const notificationsByCategory = {};
    
    for (const category of categories) {
      const count = await Notification.countDocuments({ category });
      notificationsByCategory[category] = count;
    }
    
    // Get recent notifications
    const recentNotifications = await Notification.find({})
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get departments with their statistics
    const departments = await Department.find({}).sort({ name: 1 });
    const departmentStats = await Promise.all(departments.map(async (dept) => {
      const studentCount = await User.countDocuments({ department: dept._id, role: 'student' });
      const adminCount = await User.countDocuments({ department: dept._id, role: 'deptAdmin' });
      const notificationCount = await Notification.countDocuments({ department: dept._id });
      
      return {
        name: dept.name,
        studentCount,
        adminCount,
        notificationCount
      };
    }));
    
    res.render('dashboard/superAdmin', {
      user: req.user,
      userCount,
      departmentCount,
      notificationCount,
      studentCount,
      deptAdminCount,
      superAdminCount,
      notificationsByCategory,
      recentNotifications,
      departments,
      departmentStats,
      title: 'Super Admin Dashboard'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/');
  }
}