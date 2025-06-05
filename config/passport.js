const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load User model
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
      try {
        console.log('Login attempt for:', username);
        
        // Match user by username or email
        const user = await User.findOne({
          $or: [
            { username: username },
            { email: username }
          ]
        }).select('+password');

        if (!user) {
          console.log('User not found');
          return done(null, false, { message: 'Invalid username/email or password' });
        }

        console.log('User found:', {
          username: user.username,
          email: user.email,
          role: user.role,
          hasPassword: !!user.password
        });

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Invalid username/email or password' });
        }
      } catch (err) {
        console.error('Error in LocalStrategy:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
