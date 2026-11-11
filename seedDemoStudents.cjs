const mongoose = require('./server/node_modules/mongoose');
const Student = require('./server/models/Student.js');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/major';
const DEMO_PREFIX = 'DEMO65';
const COUNT = 65;
const branches = ['CSE', 'ECE', 'EEE', 'Civil', 'Mechanical'];
const firstNames = ['Aarav', 'Aisha', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Meera', 'Nikhil', 'Pooja', 'Rohan', 'Sana', 'Vikram', 'Ananya'];
const lastNames = ['Sharma', 'Rao', 'Kumar', 'Patil', 'Reddy', 'Shetty', 'Gowda', 'Joshi'];

function makeStudent(index) {
  const serial = String(index).padStart(3, '0');
  const firstName = firstNames[(index - 1) % firstNames.length];
  const lastName = lastNames[(index - 1) % lastNames.length];
  const name = `${firstName} ${lastName}`;
  const branch = branches[(index - 1) % branches.length];
  const studyYear = ((index - 1) % 4) + 1;
  const email = `demo.student.${serial}@example.com`;
  const studentId = `${DEMO_PREFIX}-${serial}`;
  const cetNumber = `CET-DEMO-${serial}`;
  const admissionNumber = `ADM-DEMO-${serial}`;
  const phone = `90000${String(10000 + index).slice(-5)}`;
  const aadhaar = `99990000${String(1000 + index).slice(-4)}`;

  return {
    personalDetails: {
      cetNumber,
      cetRank: 1000 + index,
      studentName: name,
      dob: new Date(2004, index % 12, (index % 27) + 1),
      gender: index % 2 === 0 ? 'Female' : 'Male',
      bloodGroup: index % 3 === 0 ? 'B+' : 'O+',
      religion: 'Hindu',
      category: index % 5 === 0 ? 'OBC' : 'General',
      subCaste: '',
      aadhaarNumber: aadhaar,
      physicallyChallenged: 'No'
    },
    familyDetails: {
      fatherName: `${lastName} Parent`,
      motherName: `${firstName} Mother`,
      parentContact: `80000${String(10000 + index).slice(-5)}`,
      fatherOccupation: 'Engineer',
      motherOccupation: 'Teacher',
      annualIncome: 450000 + (index * 2500)
    },
    academicDetails: {
      qualifyingExam: 'PUC',
      board: 'Karnataka State Board',
      state: 'Karnataka',
      region: index % 2 === 0 ? 'Urban' : 'Rural',
      allottedCategory: 'General',
      branch,
      year: studyYear,
      feeCollected: 0,
      percentage: 78 + (index % 18),
      lateralEntry: 'No'
    },
    contactDetails: {
      studentContact: phone,
      email,
      permanentAddress: `${index} Demo Layout, Bengaluru, Karnataka`,
      correspondenceAddress: `${index} Demo Layout, Bengaluru, Karnataka`,
      sameAsPermanent: true
    },
    securityDetails: {
      password: 'Student@123',
      securityQuestion: 'What is your city?',
      securityAnswer: 'Bengaluru'
    },
    studentId,
    admissionNumber,
    admissionType: 'Regular',
    faceRegistered: false,
    approvalStatus: 'Approved',
    studentStatus: 'Active',
    admissionQuota: 'CET',
    admissionBatch: 2026,
    currentAcademicYear: '2026-2027',
    currentStudyYear: studyYear,
    section: index % 2 === 0 ? 'B' : 'A',
    semester: studyYear * 2 - 1,
    feeDetails: {
      totalFee: 85000,
      paidFee: 0,
      pendingFee: 85000
    },
    feeStatus: {
      previousYear: 'Completed',
      currentYear: 'Pending'
    },
    role: 'student'
  };
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  const students = Array.from({ length: COUNT }, (_, index) => makeStudent(index + 1));
  let created = 0;

  for (const studentData of students) {
    const result = await Student.updateOne(
      { studentId: studentData.studentId },
      { $setOnInsert: studentData },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;

    await Student.updateOne(
      { studentId: studentData.studentId },
      {
        $set: {
          'academicDetails.year': studentData.academicDetails.year,
          currentStudyYear: studentData.currentStudyYear,
          semester: studentData.semester
        }
      }
    );
  }

  const demoStudents = await Student.find({ studentId: new RegExp(`^${DEMO_PREFIX}-`) })
    .select('studentId admissionNumber personalDetails.studentName academicDetails.branch faceRegistered')
    .sort({ studentId: 1 })
    .lean();

  console.log(`Demo registrations available: ${demoStudents.length}`);
  console.log(`Newly created: ${created}`);
  console.log(JSON.stringify(demoStudents, null, 2));
}

seed()
  .catch((error) => {
    console.error('Demo seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
