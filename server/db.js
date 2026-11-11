const bcrypt = require('bcryptjs');

// Mock Data Arrays
const users = [];
const students = [];

// Pre-populate with admin (Principal)
const salt = bcrypt.genSaltSync(10);
users.push({
  id: 'u_1001',
  username: 'admin',
  email: 'principal@gecm.edu',
  role: 'principal',
  passwordHash: bcrypt.hashSync('admin123', salt),
  createdAt: new Date().toISOString()
});

users.push({
  id: 'u_1001a',
  username: 'system_admin',
  email: 'admin@gecm.edu',
  role: 'Admin',
  passwordHash: bcrypt.hashSync('admin123', salt),
  createdAt: new Date().toISOString()
});

// Pre-populate with office (Office Staff)
users.push({
  id: 'u_1002',
  username: 'office_admin',
  email: 'office@gecm.edu',
  role: 'Staff',
  passwordHash: bcrypt.hashSync('office123', salt),
  createdAt: new Date().toISOString()
});

// Pre-populate with HODs for each branch
users.push({
  id: 'u_1003_cse',
  username: 'hod_cse',
  email: 'hod_cse@gecm.edu',
  role: 'hod',
  branch: 'CSE',
  passwordHash: bcrypt.hashSync('hod123', salt),
  createdAt: new Date().toISOString()
});
users.push({
  id: 'u_1003_ece',
  username: 'hod_ece',
  email: 'hod_ece@gecm.edu',
  role: 'hod',
  branch: 'ECE',
  passwordHash: bcrypt.hashSync('hod123', salt),
  createdAt: new Date().toISOString()
});
users.push({
  id: 'u_1003_me',
  username: 'hod_me',
  email: 'hod_me@gecm.edu',
  role: 'hod',
  branch: 'ME',
  passwordHash: bcrypt.hashSync('hod123', salt),
  createdAt: new Date().toISOString()
});
users.push({
  id: 'u_1003_civil',
  username: 'hod_civil',
  email: 'hod_civil@gecm.edu',
  role: 'hod',
  branch: 'Civil',
  passwordHash: bcrypt.hashSync('hod123', salt),
  createdAt: new Date().toISOString()
});

// Pre-populate a Test Student Credential
users.push({
  id: 's_2001', // maps to the first mock student profile
  username: 'CET2026',
  email: 'student@gecm.edu',
  role: 'student',
  passwordHash: bcrypt.hashSync('student123', salt),
  createdAt: new Date().toISOString()
});

// Pre-populate some dummy students
for (let i = 1; i <= 5; i++) {
  students.push({
    id: `s_${2000 + i}`,
    name: `Student ${i}`,
    course: ['Computer Science', 'Civil Engineering', 'Mechanical', 'Electronic Communication'][i % 4],
    year: (i % 4) + 1,
    status: 'Active',
    feePaid: i % 2 === 0,
    admissionStatus: {
      previousYear: 'Active',
      currentYear: 'Active'
    },
    feeStatus: {
      previousYear: 'Completed',
      currentYear: i % 2 === 0 ? 'Completed' : 'Pending'
    }
  });
}

module.exports = {
  users,
  students
};
