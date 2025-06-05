const Notification = require('../models/Notification');
const User = require('../models/User');
const Department = require('../models/Department');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'public/uploads';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Initialize upload
exports.upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('file');

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /pdf|doc|docx|jpg|jpeg|png|xlsx|xls|ppt|pptx/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Invalid file type!');
  }
}

// @desc    Create notification
// @route   POST /notifications
// @access  Private (Admin only)
exports.createNotification = async (req, res) => {
  try {
    const { title, description, department, category, date } = req.body;
    let fileUrl = '';

    // Check if file was uploaded
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    // Check if department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      req.flash('error_msg', 'Department not found');
      return res.redirect('back');
    }

    // Check if dept admin is creating notification for their own department
    if (req.user.role === 'deptAdmin' && req.user.department.toString() !== department) {
      req.flash('error_msg', 'You can only create notifications for your own department');
      return res.redirect('back');
    }

    // Create notification
    const notification = new Notification({
      title,
      description,
      department,
      category,
      date: date || Date.now(),
      fileUrl,
      createdBy: req.user.id
    });

    await notification.save();

    // Send email notification to all students in the department
    try {
      const emailResult = await sendEmailNotification(notification, departmentExists.name);
      
      if (emailResult.successful > 0) {
        req.flash('success_msg', `Notification created and sent to ${emailResult.successful} students successfully`);
      } else {
        req.flash('warning_msg', 'Notification created but failed to send emails to students');
      }
      
      if (emailResult.failed > 0) {
        req.flash('warning_msg', `Failed to send emails to ${emailResult.failed} students`);
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      req.flash('warning_msg', 'Notification created but failed to send emails to students');
    }

    res.redirect('/notifications');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('back');
  }
};

// @desc    Get all notifications
// @route   GET /notifications
// @access  Private (Admin only)
exports.getNotifications = async (req, res) => {
  try {
    let query = {};
    
    // If dept admin, only show notifications from their department
    if (req.user.role === 'deptAdmin') {
      query.department = req.user.department;
    }
    
    // Filter by department if provided
    if (req.query.department) {
      query.department = req.query.department;
    }
    
    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Search by title or description if provided
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .populate('department', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get departments for filter
    const departments = await Department.find({}).sort({ name: 1 });
    
    // Get categories for filter
    const categories = Notification.schema.path('category').enumValues;
    
    // Build pagination query string
    const paginationQuery = Object.keys(req.query)
      .filter(key => key !== 'page')
      .map(key => `&${key}=${req.query[key]}`)
      .join('');
    
    res.render('notifications/index', {
      notifications,
      departments,
      categories,
      query: req.query,
      current: page,
      pages,
      paginationQuery,
      title: 'Notifications'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
};

// @desc    Get student notifications
// @route   GET /notifications/student
// @access  Private (Student only)
exports.getStudentNotifications = async (req, res) => {
  try {
    let query = {
      department: req.user.department
    };
    
    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    const notifications = await Notification.find(query)
      .populate('department', 'name')
      .sort({ createdAt: -1 });
    
    res.render('notifications/student', {
      notifications,
      categories: Notification.schema.path('category').enumValues,
      user: req.user,
      query: req.query,
      title: 'Notifications'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/dashboard');
  }
};

// @desc    Get notification by ID
// @route   GET /notifications/:id
// @access  Private (Admin only)
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('department', 'name')
      .populate('createdBy', 'name');
    
    if (!notification) {
      req.flash('error_msg', 'Notification not found');
      return res.redirect('/notifications');
    }
    
    // Check if dept admin is trying to view notification from another department
    if (req.user.role === 'deptAdmin' && 
        notification.department._id.toString() !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to view this notification');
      return res.redirect('/notifications');
    }
    
    const departments = await Department.find({}).sort({ name: 1 });
    
    res.render('notifications/edit', {
      notification,
      departments,
      categories: Notification.schema.path('category').enumValues,
      currentUser: req.user,
      title: 'Edit Notification'
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/notifications');
  }
};

// @desc    Update notification
// @route   PUT /notifications/:id
// @access  Private (Admin only)
exports.updateNotification = async (req, res) => {
  try {
    const { title, description, department, category, date } = req.body;
    
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      req.flash('error_msg', 'Notification not found');
      return res.redirect('/notifications');
    }
    
    // Check if dept admin is trying to update notification from another department
    if (req.user.role === 'deptAdmin' && 
        notification.department.toString() !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to update this notification');
      return res.redirect('/notifications');
    }
    
    // Check if dept admin is trying to change department
    if (req.user.role === 'deptAdmin' && department !== req.user.department.toString()) {
      req.flash('error_msg', 'Department Admin can only create notifications for their own department');
      return res.redirect('/notifications');
    }
    
    // Update notification fields
    notification.title = title;
    notification.description = description;
    notification.category = category;
    notification.date = date || notification.date;
    
    // Only super admin can change department
    if (req.user.role === 'superAdmin') {
      notification.department = department;
    }
    
    // Check if file was uploaded
    if (req.file) {
      // Delete old file if exists
      if (notification.fileUrl) {
        const oldFilePath = path.join(__dirname, '..', 'public', notification.fileUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      notification.fileUrl = `/uploads/${req.file.filename}`;
    }
    
    await notification.save();
    
    req.flash('success_msg', 'Notification updated successfully');
    res.redirect('/notifications');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/notifications');
  }
};

// @desc    Delete notification
// @route   DELETE /notifications/:id
// @access  Private (Admin only)
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      req.flash('error_msg', 'Notification not found');
      return res.redirect('/notifications');
    }
    
    // Check if dept admin is trying to delete notification from another department
    if (req.user.role === 'deptAdmin' && 
        notification.department.toString() !== req.user.department.toString()) {
      req.flash('error_msg', 'Not authorized to delete this notification');
      return res.redirect('/notifications');
    }
    
    // Delete file if exists
    if (notification.fileUrl) {
      const filePath = path.join(__dirname, '..', 'public', notification.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await notification.deleteOne();
    
    req.flash('success_msg', 'Notification deleted successfully');
    res.redirect('/notifications');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/notifications');
  }
};

// @desc    View notification details
// @route   GET /notifications/:id/view
// @access  Private (Admin only)
exports.viewNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('department', 'name')
      .populate('createdBy', 'name');
    if (!notification) {
      req.flash('error_msg', 'Notification not found');
      return res.redirect('/notifications');
    }
    res.render('notifications/view', {
      notification,
      title: 'Notification Details',
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server Error');
    res.redirect('/notifications');
  }
};

// Send email notification to all students in the department
async function sendEmailNotification(notification, departmentName) {
  try {
    // Get all students in the department
    const students = await User.find({
      role: 'student',
      department: notification.department,
      email: { $exists: true, $ne: '' } // Only get students with valid emails
    }).select('email name'); // Only select email and name fields
    
    if (students.length === 0) {
      console.log('No students found in the department with valid email addresses');
      return;
    }
    
    // Create email transporter with error handling
    let transporter;
    try {
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      // Verify transporter configuration
      await transporter.verify();
    } catch (error) {
      console.error('Error creating email transporter:', error);
      throw new Error('Failed to configure email service');
    }
    
    // Prepare email content with better formatting
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">${notification.title}</h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Category:</strong> ${notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}</p>
          <p style="margin: 5px 0;"><strong>Department:</strong> ${departmentName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(notification.date).toLocaleString()}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-bottom: 10px;">Notification Details:</h3>
          <p style="line-height: 1.6;">${notification.description}</p>
        </div>
        
        ${notification.fileUrl ? `
          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0;"><strong>Attachment Available:</strong></p>
            <a href="${process.env.BASE_URL || 'http://localhost:5000'}${notification.fileUrl}" 
               style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
              Download Attachment
            </a>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #6c757d;">
          <p style="margin: 0;">This is an automated notification from the College Notification System.</p>
          <p style="margin: 5px 0;">Please do not reply to this email.</p>
        </div>
      </div>
    `;
    
    // Send email to each student with error handling
    const emailPromises = students.map(async (student) => {
      try {
        await transporter.sendMail({
          from: `"College Notification System" <${process.env.EMAIL_FROM}>`,
          to: student.email,
          subject: `[${notification.category.toUpperCase()}] ${notification.title}`,
          html: emailContent,
          attachments: notification.fileUrl ? [
            {
              filename: path.basename(notification.fileUrl),
              path: path.join(__dirname, '..', 'public', notification.fileUrl)
            }
          ] : []
        });
        console.log(`Email sent successfully to ${student.email}`);
        return { success: true, email: student.email };
      } catch (error) {
        console.error(`Failed to send email to ${student.email}:`, error);
        return { success: false, email: student.email, error: error.message };
      }
    });
    
    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    
    // Log summary
    const successfulEmails = results.filter(r => r.success).length;
    const failedEmails = results.filter(r => !r.success);
    
    console.log(`Email notification summary:`);
    console.log(`- Total students: ${students.length}`);
    console.log(`- Successfully sent: ${successfulEmails}`);
    console.log(`- Failed: ${failedEmails.length}`);
    
    if (failedEmails.length > 0) {
      console.error('Failed email addresses:', failedEmails.map(f => f.email));
    }
    
    return {
      total: students.length,
      successful: successfulEmails,
      failed: failedEmails.length,
      failedEmails: failedEmails.map(f => f.email)
    };
  } catch (err) {
    console.error('Error in sendEmailNotification:', err);
    throw err;
  }
}