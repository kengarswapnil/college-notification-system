require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Update the path if different
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-notification-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  createSuperAdmin();
})
.catch(err => console.error('MongoDB connection error:', err));

// Create Super Admin user
async function createSuperAdmin() {
  try {
    const existingUser = await User.findOne({ username: 'superadmin' });
    if (existingUser) {
      console.log('SuperAdmin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Veer@123', 10); // Change password if needed

    const superAdmin = new User({
      name: 'Super Admin',
      username: 'superadmin',
      email: 'dharmavirlondhe@gmail.com',
      password: hashedPassword,
      role: 'superAdmin',
      department: new mongoose.Types.ObjectId() // Provide a real department ID in production
    });

    await superAdmin.save();
    console.log('SuperAdmin created successfully');
  } catch (error) {
    console.error('Error creating SuperAdmin:', error);
  } finally {
    mongoose.connection.close();
  }
}
