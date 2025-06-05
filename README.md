# College Notification and Record Management System

A web-based platform for managing users, departments, and notifications in a college environment. Built with Node.js, Express, MongoDB, and EJS, this system allows super admins and department admins to manage users, send notifications, and automate email alerts to students.

---

## Features
- **User Authentication & Roles:** Super Admin, Department Admin, and Student roles with secure login/logout.
- **User Management:** Add, edit, delete users; assign roles and departments.
- **Department Management:** Create, edit, delete departments; view department statistics.
- **Notification Management:** Create, edit, delete notifications; filter by category/department; attach files.
- **Email Notifications:** Automatically send emails to students when a notification is created.
- **Password Reset:** Users can request a password reset link via email.
- **Responsive Dashboard:** Role-based dashboards for super admins, department admins, and students.
- **Pagination & Search:** Easily find users and notifications with search and pagination.
- **Security:** Passwords are hashed; access is role-restricted; method override for RESTful actions.

---

## Tech Stack
- **Backend:** Node.js, Express.js
- **Frontend:** EJS (Embedded JavaScript Templates), Bootstrap
- **Database:** MongoDB (with Mongoose ODM)
- **Authentication:** Passport.js (local strategy)
- **Email:** Nodemailer
- **File Uploads:** Multer

---

## Getting Started

### 1. **Clone the Repository**
```bash
git clone <your-repo-url>
cd FinalCampusCore
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Set Up Environment Variables**
Create a `.env` file in the root directory with the following variables:
```env
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
EMAIL_SERVICE=your_email_service_provider # e.g., 'gmail'
EMAIL_USERNAME=your_email_address
EMAIL_PASSWORD=your_email_password_or_app_password
EMAIL_FROM=your_email_address
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
BASE_URL=http://localhost:5000 # or your deployed URL
```

### 4. **Run the Application**
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

The app will run at [http://localhost:5000](http://localhost:5000)

---

## Usage

- **Super Admin:**
  - Can manage all users, departments, and notifications.
  - Can add department admins and other super admins.
  - Has access to all dashboards and statistics.

- **Department Admin:**
  - Can manage students in their department.
  - Can create notifications for their department.
  - Can view department statistics.

- **Student:**
  - Can view notifications for their department.
  - Can update their own profile and reset password.

- **Email Notifications:**
  - When a notification is created, all students in the selected department receive an email.
  - When a user is registered, they receive a welcome email with their credentials.
  - Users can request a password reset link via email.

---

## File Structure
- `app.js` - Main Express app setup
- `models/` - Mongoose models (User, Department, Notification)
- `controllers/` - Route controllers
- `routes/` - Express route definitions
- `views/` - EJS templates for all pages
- `public/` - Static files (CSS, JS, uploads)

---

## Notes
- **Default Super Admin:** If not present, create a super admin user manually or via a script.
- **File Uploads:** Uploaded files are stored in `public/uploads/`.
- **Security:** For production, use environment variables and secure your credentials.
- **Deprecation Warnings:** Some warnings may appear due to dependencies; update packages as needed.

---

## License
This project is for educational purposes. Adapt and use as needed for your institution. 