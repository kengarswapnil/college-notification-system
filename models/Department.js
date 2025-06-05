const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a department name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Department name cannot be more than 50 characters']
  },
  code: {
    type: String,
    required: [true, 'Please add a department code'],
    unique: true,
    trim: true,
    maxlength: [10, 'Department code cannot be more than 10 characters']
  },
  description: {
    type: String,
    required: false,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Department', DepartmentSchema);