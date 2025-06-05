const Department = require('../models/Department');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all departments
// @route   GET /departments
// @access  Private (Super Admin only)
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    
    // Get statistics for each department
    const departmentsWithStats = await Promise.all(departments.map(async (dept) => {
      const studentCount = await User.countDocuments({ department: dept._id, role: 'student' });
      const adminCount = await User.countDocuments({ department: dept._id, role: 'deptAdmin' });
      const notificationCount = await Notification.countDocuments({ department: dept._id });
      
      return {
        ...dept.toObject(),
        studentCount,
        adminCount,
        notificationCount
      };
    }));
    
    res.render('departments/index', {
      departments: departmentsWithStats,
      currentUser: req.user,
      title: 'Departments'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
};

// @desc    Create department
// @route   POST /departments
// @access  Private (Super Admin only)
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Check if department already exists
    const departmentExists = await Department.findOne({ $or: [{ name }, { code }] });

    if (departmentExists) {
      req.flash('error_msg', 'Department already exists with that name or code');
      return res.redirect('/departments');
    }

    // Create department
    const department = new Department({
      name,
      code,
      description
    });

    await department.save();

    req.flash('success_msg', 'Department created successfully');
    res.redirect('/departments');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/departments');
  }
};

// @desc    Get department by ID
// @route   GET /departments/:id
// @access  Private (Super Admin only)
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      req.flash('error_msg', 'Department not found');
      return res.redirect('/departments');
    }
    
    res.render('departments/edit', {
      department,
      title: 'Edit Department'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/departments');
  }
};

// @desc    Update department
// @route   PUT /departments/:id
// @access  Private (Super Admin only)
exports.updateDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      req.flash('error_msg', 'Department not found');
      return res.redirect('/departments');
    }
    
    // Check if name or code already exists for another department
    const existingDepartment = await Department.findOne({
      $or: [{ name }, { code }],
      _id: { $ne: req.params.id }
    });
    
    if (existingDepartment) {
      req.flash('error_msg', 'Department already exists with that name or code');
      return res.redirect(`/departments/${req.params.id}`);
    }
    
    // Update department fields
    department.name = name;
    department.code = code;
    department.description = description;
    
    await department.save();
    
    req.flash('success_msg', 'Department updated successfully');
    res.redirect('/departments');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/departments');
  }
};

// @desc    Delete department
// @route   DELETE /departments/:id
// @access  Private (Super Admin only)
exports.deleteDepartment = async (req, res) => {
  console.log('DELETE /departments/' + req.params.id + ' called');
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      req.flash('error_msg', 'Department not found');
      return res.redirect('/departments');
    }
    
    // Check if department has users
    const usersCount = await User.countDocuments({ department: req.params.id });
    
    if (usersCount > 0) {
      req.flash('error_msg', `Cannot delete department. It has ${usersCount} users associated with it.`);
      return res.redirect('/departments');
    }
    
    // Check if department has notifications
    const notificationsCount = await Notification.countDocuments({ department: req.params.id });
    
    if (notificationsCount > 0) {
      req.flash('error_msg', `Cannot delete department. It has ${notificationsCount} notifications associated with it.`);
      return res.redirect('/departments');
    }
    
    await department.deleteOne();
    
    req.flash('success_msg', 'Department deleted successfully');
    res.redirect('/departments');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/departments');
  }
};

// @desc    Get department data
// @route   GET /departments/:id/data
// @access  Private (Admin only)
exports.getDepartmentData = async (req, res) => {
  try {
    let departmentId = req.params.id;
    if (typeof departmentId === 'string' && departmentId.includes(':')) {
      // Handles cases like `{ id: 123 }`
      const parts = departmentId.replace(/[`{}]/g, '').split(':');
      departmentId = (parts[1] ? parts[1].trim() : parts[0].trim());
    }
    
    const department = await Department.findById(departmentId);
    
    if (!department) {
      req.flash('error_msg', 'Department not found');
      return res.redirect('/dashboard');
    }
    
    // Check if dept admin is trying to view data from another department
    if (req.user.role === 'deptAdmin' && 
        departmentId !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to view this department data');
      return res.redirect('/dashboard');
    }
    
    // Get users in department
    const users = await User.find({ department: departmentId }).sort({ name: 1 });
    
    // Get notifications by category
    const categories = Notification.schema.path('category').enumValues;
    const notificationsByCategory = {};
    
    for (const category of categories) {
      const count = await Notification.countDocuments({
        department: departmentId,
        category
      });
      
      notificationsByCategory[category] = count;
    }
    
    // Get total notifications
    const totalNotifications = await Notification.countDocuments({ department: departmentId });
    
    // Get user counts by role
    const studentCount = await User.countDocuments({ department: departmentId, role: 'student' });
    const deptAdminCount = await User.countDocuments({ department: departmentId, role: 'deptAdmin' });
    
    res.render('departments/data', {
      department,
      users,
      notificationsByCategory,
      totalNotifications,
      studentCount,
      deptAdminCount,
      title: 'Department Data'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
};