require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');


// Initialize Express app
const app = express();

// Passport config
require('./config/passport')(passport);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-notification-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));


// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Express body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override middleware
app.use(methodOverride('_method'));

// Express session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/notifications', require('./routes/notifications'));
app.use('/departments', require('./routes/departments'));

// Error handling middleware
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found',
    user: req.user // Ensure user is passed to the template
  });
});

// 404 handler middleware (should be last)
app.use((req, res, next) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    user: req.user // or null if you don't have user info here
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));