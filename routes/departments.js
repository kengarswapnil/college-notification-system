const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin, ensureSuperAdmin } = require('../middleware/auth');
const departmentController = require('../controllers/departmentController');

// Get All Departments - Super Admin Only
router.get('/', ensureSuperAdmin, departmentController.getDepartments);

// Add Department Form - Super Admin Only
router.get('/add', ensureSuperAdmin, (req, res) => {
  res.render('departments/add', {
    title: 'Add Department'
  });
});

// Create Department - Super Admin Only
router.post('/', ensureSuperAdmin, departmentController.createDepartment);

// Get Department Data - Admin Only
router.get('/:id/data', ensureAdmin, departmentController.getDepartmentData);

// Get Department by ID - Super Admin Only
router.get('/:id', ensureSuperAdmin, departmentController.getDepartmentById);

// Update Department - Super Admin Only
router.put('/:id', ensureSuperAdmin, departmentController.updateDepartment);

// Delete Department - Super Admin Only
router.delete('/:id', ensureSuperAdmin, departmentController.deleteDepartment);

module.exports = router;