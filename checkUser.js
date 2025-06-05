const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-notification-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  checkUser();
})
.catch(err => console.error('MongoDB connection error:', err));

async function checkUser() {
  try {
    // Get all users with their passwords
    const users = await User.find({}).select('+password');
    
    console.log('\nFound users in database:');
    console.log('------------------------');
    
    users.forEach(user => {
      console.log(`\nUsername: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Department: ${user.department}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      console.log('------------------------');
    });

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    mongoose.connection.close();
  }
} 