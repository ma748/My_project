const mongoose = require('mongoose');
const Student = require('./models/Student');
const Setting = require('./models/Setting');
const FeePlan = require('./models/FeePlan');
const AcademicYearStatus = require('./models/AcademicYearStatus');
const AdmissionConfirmation = require('./models/AdmissionConfirmation');
const FeePayment = require('./models/FeePayment');
const PromotionHistory = require('./models/PromotionHistory');
const Notification = require('./models/Notification');
const DocumentRecord = require('./models/DocumentRecord');

const yearLabels = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year'
};

const toObjectId = (value) => mongoose.Types.ObjectId.isValid(value) ? value : undefined;

const getCurrentAcademicYear = async () => {
  const yearSetting = await Setting.findOne({ key: 'academicYear' });
  if (yearSetting?.value) return yearSetting.value;
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const getNextAcademicYear = (academicYear) => {
  const match = String(academicYear || '').match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    const year = new Date().getFullYear() + 1;
    return `${year}-${year + 1}`;
  }
  return `${Number(match[1]) + 1}-${Number(match[2]) + 1}`;
};

const getStudyYear = (student, academicYear = student?.currentAcademicYear) => {
  const batchYear = Number(student?.admissionBatch);
  const academicStartYear = Number(String(academicYear || '').match(/^(\d{4})/)?.[1]);
  if (Number.isInteger(batchYear) && Number.isInteger(academicStartYear)) {
    const firstStudyYear = student?.admissionType === 'Lateral Entry' ? 2 : 1;
    return Math.min(4, Math.max(firstStudyYear, academicStartYear - batchYear + firstStudyYear));
  }
  const value = Number(student.currentStudyYear || student.academicDetails?.year || 1);
  return Math.min(4, Math.max(1, Number.isFinite(value) ? value : 1));
};

const getAcademicYearForStudyYear = (student, studyYear) => {
  const batchYear = Number(student?.admissionBatch);
  const year = Number(studyYear);
  if (!Number.isInteger(batchYear) || !Number.isInteger(year) || year < 1 || year > 4) return null;
  const firstStudyYear = student?.admissionType === 'Lateral Entry' ? 2 : 1;
  const startYear = batchYear + year - firstStudyYear;
  return `${startYear}-${startYear + 1}`;
};

const getSemesterForYear = (studyYear, existingSemester) => {
  const semester = Number(existingSemester);
  if (semester >= 1 && semester <= 8 && Math.ceil(semester / 2) === studyYear) return semester;
  return (studyYear * 2) - 1;
};

const getAdmissionQuota = (student) => {
  if (student.academicDetails?.lateralEntry === 'Yes') return 'Lateral Entry';
  if (student.contactDetails?.snqQuota === 'Yes') return 'SNQ';
  return student.admissionQuota || 'CET';
};

const getFeePlanAmount = async (student, studyYear) => {
  const batch = Number(student.admissionBatch) || new Date().getFullYear();
  const plan = await FeePlan.findOne({ batch });
  if (!plan) return Number(student.feeDetails?.totalFee) || 85000;
  return Number(plan[`year${studyYear}`]) || Number(student.feeDetails?.totalFee) || 85000;
};

const calculateFeeBreakup = async (student, studyYear, existingPaid = 0) => {
  const totalFee = await getFeePlanAmount(student, studyYear);
  const examFee = studyYear === 1 ? 3000 : 4500;
  const universityFee = studyYear === 1 ? 5000 : 3500;
  const scholarshipAdjustment = student.contactDetails?.snqQuota === 'Yes' ? Math.round(totalFee * 0.25) : 0;
  const tuitionFee = Math.max(0, totalFee - examFee - universityFee);
  const payable = Math.max(0, totalFee - scholarshipAdjustment);
  const paidAmount = Math.max(0, Number(existingPaid) || 0);
  const outstandingBalance = Math.max(0, payable - paidAmount);
  const feeConfirmationStatus = outstandingBalance <= 0
    ? 'Confirmed'
    : paidAmount > 0
      ? 'Partially Paid'
      : 'Pending';

  return {
    tuitionFee,
    universityFee,
    examFee,
    scholarshipAdjustment,
    totalFee: payable,
    paidAmount,
    outstandingBalance,
    feeConfirmationStatus
  };
};

const syncAcademicStatus = async ({ student, academicYear, studyYear, semester, admission, fee, userId, remarks }) => {
  const hasPendingPromotion = await PromotionHistory.exists({
    student: student._id,
    academicYear,
    fromYear: studyYear,
    recommendationStatus: { $in: ['Pending HOD', 'HOD Approved', 'Pending Principal', 'Principal Approved'] }
  });

  let promotionStatus = 'Not Started';
  if (admission?.admissionStatus === 'Confirmed' && fee?.feeConfirmationStatus === 'Confirmed') {
    promotionStatus = hasPendingPromotion ? 'Recommended' : 'Eligible';
  }
  if (student.studentStatus === 'Graduated') promotionStatus = 'Graduated';

  const academicStatus = await AcademicYearStatus.findOneAndUpdate(
    { student: student._id, academicYear, studyYear },
    {
      $set: {
        studentId: student.studentId,
        semester,
        admissionStatus: student.studentStatus === 'Graduated' ? 'Graduated' : admission?.admissionStatus || 'Pending',
        feeStatus: fee?.feeConfirmationStatus || 'Pending',
        promotionStatus,
        remarks: remarks || '',
        approvalDate: admission?.confirmationDate || fee?.confirmationDate,
        approvedBy: toObjectId(userId)
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return academicStatus;
};

const seedDocumentRecords = async (student, academicYear) => {
  const docs = [
    ['Aadhaar', student.documents?.aadhaar],
    ['Marks Card', student.documents?.marksCard],
    ['Photo', student.documents?.photo]
  ];

  await Promise.all(docs.map(([documentType, fileData]) => DocumentRecord.findOneAndUpdate(
    { student: student._id, documentType, academicYear },
    {
      $setOnInsert: {
        studentId: student.studentId,
        fileData,
        verificationStatus: fileData ? 'Verified' : 'Pending'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
};

const ensureLifecycleForStudent = async (student, options = {}) => {
  if (!student) return null;

  let changed = false;
  const academicYear = options.academicYear || await getCurrentAcademicYear() || student.currentAcademicYear;
  const storedStudyYear = Math.min(4, Math.max(1, Number(student.currentStudyYear || student.academicDetails?.year || 1)));
  const studyYear = getStudyYear(student, academicYear);
  const semester = getSemesterForYear(studyYear, student.semester);

  // Advancing the configured academic year completes the student's prior year.
  // Record that progression automatically so no office/HOD/principal action is needed.
  const previousStartYear = Number(String(student.currentAcademicYear || '').match(/^(\d{4})/)?.[1]);
  const currentStartYear = Number(String(academicYear || '').match(/^(\d{4})/)?.[1]);
  if (
    student.approvalStatus === 'Approved' &&
    student.studentId &&
    Number.isInteger(previousStartYear) &&
    Number.isInteger(currentStartYear) &&
    currentStartYear > previousStartYear &&
    studyYear > storedStudyYear &&
    storedStudyYear < 4
  ) {
    const completedYear = student.currentAcademicYear;
    const alreadyPromoted = await PromotionHistory.exists({
      student: student._id,
      academicYear: completedYear,
      fromYear: storedStudyYear,
      recommendationStatus: 'Promoted'
    });
    const promotion = await PromotionHistory.findOneAndUpdate(
      { student: student._id, academicYear: completedYear, fromYear: storedStudyYear },
      {
        $set: {
          studentId: student.studentId,
          toYear: studyYear,
          targetStatus: 'Active',
          recommendationStatus: 'Promoted',
          remarks: 'Automatically promoted after completion of the academic year.'
        },
        $setOnInsert: { recommendedAt: new Date() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await AcademicYearStatus.updateOne(
      { student: student._id, academicYear: completedYear, studyYear: storedStudyYear },
      { $set: { promotionStatus: 'Promoted', remarks: 'Automatically promoted after completion of the academic year.' } }
    );
    if (!alreadyPromoted && promotion) {
      await createNotification({
        student,
        title: `Promoted to Year ${studyYear}`,
        message: `Your ${completedYear} academic year is complete. You have been automatically promoted to Year ${studyYear}.`,
        type: 'Promotion'
      });
    }
  }

  // Older records could be assigned the system's current year and default to
  // Year 1 even when their admission batch places them in a later year. Move
  // this academic year's lifecycle records to the cohort-derived study year.
  if (student.approvalStatus === 'Approved' && storedStudyYear !== studyYear) {
    const oldKey = { student: student._id, academicYear, studyYear: storedStudyYear };
    const newKey = { student: student._id, academicYear, studyYear };
    const [oldAdmission, newAdmission, oldFee, newFee, oldAcademic, newAcademic] = await Promise.all([
      AdmissionConfirmation.findOne(oldKey), AdmissionConfirmation.findOne(newKey),
      FeePayment.findOne(oldKey), FeePayment.findOne(newKey),
      AcademicYearStatus.findOne(oldKey), AcademicYearStatus.findOne(newKey)
    ]);

    if (oldAdmission && !newAdmission) {
      oldAdmission.studyYear = studyYear;
      oldAdmission.semester = semester;
      if (oldFee?.feeConfirmationStatus === 'Confirmed' || oldFee?.feeConfirmationStatus === 'Waived') oldAdmission.feeVerificationStatus = 'Verified';
      await oldAdmission.save();
    }
    if (oldFee && !newFee) {
      await FeePayment.updateOne(
        { _id: oldFee._id },
        { $set: { studyYear, 'payments.$[payment].studyYear': studyYear } },
        { arrayFilters: [{ 'payment.academicYear': academicYear, 'payment.studyYear': storedStudyYear }] }
      );
    }
    for (const payment of student.feeHistory || []) {
      if (payment.academicYear === academicYear && Number(payment.studyYear) === storedStudyYear) {
        payment.studyYear = studyYear;
        changed = true;
      }
    }
    if (oldAcademic && !newAcademic) {
      oldAcademic.studyYear = studyYear;
      oldAcademic.semester = semester;
      await oldAcademic.save();
    }
    await PromotionHistory.updateMany(
      { student: student._id, academicYear, fromYear: { $ne: studyYear }, recommendationStatus: { $in: ['Pending HOD', 'HOD Approved', 'Pending Principal', 'Principal Approved'] } },
      { $set: { recommendationStatus: 'Cancelled', remarks: `Cancelled after correcting study year to Year ${studyYear} from admission batch ${student.admissionBatch}.` } }
    );
  }

  if (student.approvalStatus === 'Approved') {
    if (student.currentAcademicYear !== academicYear) {
      student.currentAcademicYear = academicYear;
      changed = true;
    }
    if (student.currentStudyYear !== studyYear) {
      student.currentStudyYear = studyYear;
      changed = true;
    }
    if (student.academicDetails.year !== studyYear) {
      student.academicDetails.year = studyYear;
      changed = true;
    }
    if (student.semester !== semester) {
      student.semester = semester;
      changed = true;
    }
    if (!student.admissionQuota) {
      student.admissionQuota = getAdmissionQuota(student);
      changed = true;
    }
    if (!['Active', 'Graduated'].includes(student.studentStatus)) {
      student.studentStatus = 'Active';
      changed = true;
    }
  } else if (student.approvalStatus === 'Rejected' && student.studentStatus !== 'Rejected') {
    student.studentStatus = 'Rejected';
    changed = true;
  }

  if (changed) await student.save();
  if (!student.studentId || student.approvalStatus !== 'Approved') return { student };

  // Fast-path: Skip expensive multi-document upserts and recalculations if lifecycle records are already in place
  if (!options.force) {
    const existingAdmission = await AdmissionConfirmation.findOne({ student: student._id, academicYear, studyYear }).lean();
    if (existingAdmission) return { student, admission: existingAdmission };
  }

  const admission = await AdmissionConfirmation.findOneAndUpdate(
    { student: student._id, academicYear, studyYear },
    {
      $setOnInsert: {
        studentId: student.studentId,
        semester,
        continuationVerified: true,
        documentVerificationStatus: 'Verified',
        seatAllotmentStatus: 'Confirmed',
        admissionStatus: 'Confirmed',
        feeVerificationStatus: student.feeStatus?.currentYear === 'Completed' ? 'Verified' : 'Due',
        confirmationDate: student.createdAt || new Date(),
        remarks: studyYear === 1 ? 'Initial admission confirmed' : ''
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const feeBreakup = await calculateFeeBreakup(student, studyYear, student.feeDetails?.paidFee);
  const fee = await FeePayment.findOneAndUpdate(
    { student: student._id, academicYear, studyYear },
    {
      $setOnInsert: {
        studentId: student.studentId,
        ...feeBreakup,
        paymentVerified: feeBreakup.outstandingBalance <= 0,
        receiptNumber: feeBreakup.outstandingBalance <= 0 ? `FEE-${Date.now()}` : undefined,
        confirmationDate: feeBreakup.outstandingBalance <= 0 ? new Date() : undefined,
        payments: student.feeHistory || []
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await syncAcademicStatus({
    student,
    academicYear,
    studyYear,
    semester,
    admission,
    fee,
    userId: options.userId
  });

  await seedDocumentRecords(student, academicYear);
  return { student, admission, fee };
};

const ensureLifecycleForApprovedStudents = async (filter = {}, options = {}) => {
  const students = await Student.find({ approvalStatus: 'Approved', ...filter });
  for (const student of students) {
    await ensureLifecycleForStudent(student, options);
  }
  return students.length;
};

const createNotification = async ({ student, audienceRole = 'Student', title, message, type = 'System', createdBy }) => {
  return Notification.create({
    student: student?._id,
    studentId: student?.studentId,
    audienceRole,
    title,
    message,
    type,
    createdBy: toObjectId(createdBy)
  });
};

module.exports = {
  yearLabels,
  toObjectId,
  getCurrentAcademicYear,
  getNextAcademicYear,
  getStudyYear,
  getAcademicYearForStudyYear,
  getSemesterForYear,
  getFeePlanAmount,
  calculateFeeBreakup,
  ensureLifecycleForStudent,
  ensureLifecycleForApprovedStudents,
  syncAcademicStatus,
  createNotification
};
