const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-notification-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  resetPassword();
})
.catch(err => console.error('MongoDB connection error:', err));

async function resetPassword() {
  try {
    // Find superadmin user
    const user = await User.findOne({ username: 'superadmin' }).select('+password');
    
    if (!user) {
      console.log('Superadmin user not found');
      process.exit(1);
    }

    console.log('Current user:', {
      username: user.username,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password
    });

    // Set new password directly
    const newPassword = 'Veer@123';
    user.password = newPassword; // Let the pre-save hook handle hashing
    
    await user.save();
    
    // Verify the password was set correctly
    const updatedUser = await User.findOne({ username: 'superadmin' }).select('+password');
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    
    console.log('Password verification:', {
      passwordSet: !!updatedUser.password,
      passwordMatch: isMatch
    });
    
    console.log('Superadmin password has been reset to:', newPassword);
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    mongoose.connection.close();
  }
} 