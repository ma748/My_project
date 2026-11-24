import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { isValidCETNumber, isValidCETRank, sanitizeCETNumber, sanitizeCETRank } from '../../utils/cetValidation';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle,
  Download,
  Edit2,
  FileDown,
  FileText,
  Printer,
  KeyRound,
  Search,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRoundCog,
  Users,
  X
} from 'lucide-react';

const API = '/api/office';
const DRAFT_KEY = 'office_new_admission_draft';
const branchesFallback = ['CSE', 'ECE', 'ME', 'Civil'];

const initialForm = {
  studentId: '',
  usn: '',
  admissionNumber: '',
  studentName: '',
  fatherName: '',
  motherName: '',
  dob: '',
  gender: 'Male',
  bloodGroup: 'O+',
  religion: '',
  category: 'GM',
  subCaste: '',
  physicallyChallenged: 'No',
  aadhaarNumber: '',
  studentContact: '',
  parentContact: '',
  email: '',
  cetNumber: '',
  cetRank: '',
  branch: 'CSE',
  allottedCategory: 'GM',
  defenceQuota: 'No',
  sportsQuota: 'No',
  snqQuota: 'No',
  region: 'Karnataka',
  feeCollected: '',
  feeCollectedIdp: '0',
  feeCollectedVtu: '0',
  feeCollectedPd: '0',
  annualIncome: '',
  distance: '',
  qualifyingExam: 'PUC',
  state: 'Karnataka',
  // PUC educational fields
  pucCollegeName: '',
  pucBoard: 'Karnataka State Pre-University Board',
  pucRegNumber: '',
  pucPassingYear: '',
  pucMarks: '',
  pucPercentage: '',
  // Diploma educational fields
  diplomaCollegeName: '',
  diplomaBoard: 'Department of Technical Education, Karnataka',
  diplomaRegNumber: '',
  diplomaPassingYear: '',
  diplomaMarks: '',
  diplomaPercentage: '',
  diplomaPassed: 'No',
  // Address & family
  permanentAddress: '',
  correspondenceAddress: '',
  sameAsPermanent: false,
  fatherOccupation: '',
  motherOccupation: '',
  admissionType: 'Regular',
  academicBatch: '2026–30'
};

const steps = [
  'Personal Details',
  'Admission & Reservation',
  'Previous Education',
  'Address & Family'
];

// studentId, usn, and admissionNumber are NOT mandatory during initial admission entry
const requiredByStep = [
  ['studentName', 'fatherName', 'motherName', 'dob', 'gender', 'bloodGroup', 'religion', 'category', 'aadhaarNumber', 'studentContact', 'parentContact', 'email'],
  ['cetNumber', 'cetRank', 'branch', 'allottedCategory', 'region', 'feeCollected', 'annualIncome', 'distance'],
  ['qualifyingExam', 'state'],
  ['permanentAddress', 'correspondenceAddress', 'fatherOccupation', 'motherOccupation']
];

export default function AdmissionVerification({ initialTab = 'form' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => (initialTab === 'search' || initialTab === 'update' ? 'search' : 'form'));
  const [batchSelected, setBatchSelected] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState(branchesFallback);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [page, setPage] = useState(1);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [enrollmentStudent, setEnrollmentStudent] = useState(null);
  const [enrollment, setEnrollment] = useState({ batch: new Date().getFullYear(), semester: 1, section: 'A' });
  const [credentials, setCredentials] = useState(null);
  const pageSize = 8;

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (initialTab === 'search' || initialTab === 'update') {
      setActiveTab('search');
    }
  }, [initialTab]);

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && !editStudent) {
      try {
        setForm((prev) => ({ ...initialForm, ...JSON.parse(draft) }));
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    fetchSettings();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!editStudent) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, editStudent]);

  useEffect(() => {
    setPage(1);
  }, [students.length, searchQuery, filterBranch]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.trim().toLowerCase();
      const branchMatches = filterBranch === 'All' || student.academicDetails?.branch === filterBranch;
      if (!q) return branchMatches;
      const values = [
        student.admissionNumber,
        student.studentId,
        student.usn,
        student.personalDetails?.cetNumber,
        student.personalDetails?.studentName,
        student.personalDetails?.aadhaarNumber,
        student.contactDetails?.studentContact,
        student.familyDetails?.parentContact,
        student.contactDetails?.email,
        student.academicDetails?.branch,
        student.personalDetails?.cetRank,
        student.admissionType
      ];
      return branchMatches && values.some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [students, searchQuery, filterBranch]);

  const paginatedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  const stats = useMemo(() => {
    const branchWise = {};
    const categoryWise = {};
    const quotaWise = { Defence: 0, Sports: 0, SNQ: 0 };
    students.forEach((student) => {
      const branch = student.academicDetails?.branch || 'Unassigned';
      const category = student.personalDetails?.category || 'Unknown';
      branchWise[branch] = (branchWise[branch] || 0) + 1;
      categoryWise[category] = (categoryWise[category] || 0) + 1;
      if (student.contactDetails?.defenceQuota === 'Yes') quotaWise.Defence += 1;
      if (student.contactDetails?.sportsQuota === 'Yes') quotaWise.Sports += 1;
      if (student.contactDetails?.snqQuota === 'Yes') quotaWise.SNQ += 1;
    });
    return { total: students.length, branchWise, categoryWise, quotaWise };
  }, [students]);

  const completion = Math.round(((step + 1) / steps.length) * 100);

  const isLateral = form.admissionType === 'Lateral Entry' || form.admissionType === 'Lateral';
  const availableBatches = isLateral
    ? ['2024–27', '2025–28', '2026–29']
    : ['2023–27', '2024–28', '2025–29', '2026–30'];

  const startAdmission = () => {
    if (!form.academicBatch || !form.branch) {
      toast.error('Select an academic batch and branch to continue');
      return;
    }
    setBatchSelected(true);
    toast.success(`${form.academicBatch} • ${form.branch} admission workspace opened`);
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`, { headers });
      const departments = res.data.departments || branchesFallback;
      setBranches(departments);
      setForm((prev) => ({ ...prev, branch: prev.branch || departments[0] || 'CSE' }));
    } catch {
      setBranches(branchesFallback);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/students`, { headers });
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load admission records');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'sameAsPermanent') {
        next.sameAsPermanent = value;
        if (value) next.correspondenceAddress = prev.permanentAddress;
      }
      if (field === 'permanentAddress' && prev.sameAsPermanent) {
        next.correspondenceAddress = value;
      }
      if (field === 'admissionType') {
        const lateral = String(value).toLowerCase().includes('lateral');
        next.admissionType = lateral ? 'Lateral Entry' : 'Regular';
        next.qualifyingExam = lateral ? 'Diploma' : 'PUC';
        next.diplomaPassed = lateral ? 'Yes' : 'No';
        const batches = lateral ? ['2024–27', '2025–28', '2026–29'] : ['2023–27', '2024–28', '2025–29', '2026–30'];
        if (!batches.includes(next.academicBatch)) {
          next.academicBatch = batches[batches.length - 1];
        }
        // Do not retain hidden fields from the previously selected admission type
        if (lateral) {
          next.pucCollegeName = '';
          next.pucBoard = '';
          next.pucRegNumber = '';
          next.pucPassingYear = '';
          next.pucMarks = '';
          next.pucPercentage = '';
          next.diplomaBoard = prev.diplomaBoard || 'Department of Technical Education, Karnataka';
        } else {
          next.diplomaCollegeName = '';
          next.diplomaBoard = '';
          next.diplomaRegNumber = '';
          next.diplomaPassingYear = '';
          next.diplomaMarks = '';
          next.diplomaPercentage = '';
          next.pucBoard = prev.pucBoard || 'Karnataka State Pre-University Board';
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = (targetStep = step) => {
    const nextErrors = {};
    const lateral = isLateral;

    // Check basic required fields for the step
    requiredByStep[targetStep].forEach((field) => {
      if (!String(form[field] ?? '').trim()) nextErrors[field] = 'This field is required.';
    });

    if (targetStep === 0) {
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
      if (form.studentContact && !/^\d{10}$/.test(form.studentContact)) nextErrors.studentContact = 'Phone number must contain 10 digits.';
      if (form.parentContact && !/^\d{10}$/.test(form.parentContact)) nextErrors.parentContact = 'Phone number must contain 10 digits.';
      if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) nextErrors.aadhaarNumber = 'Aadhaar number must contain 12 digits.';
    }

    if (targetStep === 1) {
      // Identifiers are optional during initial admission. If entered, check duplicate uniqueness.
      if (form.studentId && students.some((s) => s.studentId?.toUpperCase() === form.studentId.trim().toUpperCase() && s._id !== editStudent?._id)) {
        nextErrors.studentId = 'Student ID is already in use.';
      }
      if (form.usn && students.some((s) => s.usn?.toUpperCase() === form.usn.trim().toUpperCase() && s._id !== editStudent?._id)) {
        nextErrors.usn = 'USN is already in use.';
      }
      if (form.admissionNumber && students.some((s) => s.admissionNumber?.toUpperCase() === form.admissionNumber.trim().toUpperCase() && s._id !== editStudent?._id)) {
        nextErrors.admissionNumber = 'Admission Number is already in use.';
      }
      if (form.cetNumber && students.some((s) => s.personalDetails?.cetNumber === form.cetNumber && s._id !== editStudent?._id)) {
        nextErrors.cetNumber = 'CET Number already exists.';
      }
      if (form.cetNumber && !isValidCETNumber(form.cetNumber)) nextErrors.cetNumber = 'CET Number must be 2 letters followed by 3 digits.';
      if (form.cetRank && !isValidCETRank(form.cetRank)) nextErrors.cetRank = 'CET Rank must be a number from 1 to 1000000.';
      if (form.feeCollected && !/^\d+(\.\d{1,2})?$/.test(form.feeCollected)) nextErrors.feeCollected = 'Fee accepts decimal values.';
      ['feeCollectedIdp', 'feeCollectedVtu', 'feeCollectedPd'].forEach((field) => {
        if (form[field] && !/^\d+(\.\d{1,2})?$/.test(form[field])) nextErrors[field] = 'Fee accepts decimal values.';
      });
    }

    if (targetStep === 2) {
      if (lateral) {
        // Lateral Entry: Validate only Diploma educational fields
        if (!String(form.diplomaCollegeName || '').trim()) nextErrors.diplomaCollegeName = 'Diploma college name is required.';
        if (!String(form.diplomaBoard || '').trim()) nextErrors.diplomaBoard = 'Diploma board is required.';
        if (!String(form.diplomaRegNumber || '').trim()) nextErrors.diplomaRegNumber = 'Diploma registration number is required.';
        if (!String(form.diplomaPassingYear || '').trim()) nextErrors.diplomaPassingYear = 'Passing year is required.';
        if (!String(form.diplomaMarks || '').trim()) nextErrors.diplomaMarks = 'Diploma total marks are required.';
        if (form.diplomaMarks && !/^\d+(\.\d{1,2})?$/.test(form.diplomaMarks)) nextErrors.diplomaMarks = 'Marks must be numeric.';
        if (form.diplomaPercentage && !/^\d+(\.\d{1,2})?$/.test(form.diplomaPercentage)) nextErrors.diplomaPercentage = 'Percentage must be numeric.';
      } else {
        // Regular: Validate only PUC educational fields
        if (!String(form.pucCollegeName || '').trim()) nextErrors.pucCollegeName = 'PUC college name is required.';
        if (!String(form.pucBoard || '').trim()) nextErrors.pucBoard = 'PUC board is required.';
        if (!String(form.pucRegNumber || '').trim()) nextErrors.pucRegNumber = 'PUC registration/exam number is required.';
        if (!String(form.pucPassingYear || '').trim()) nextErrors.pucPassingYear = 'Passing year is required.';
        if (!String(form.pucMarks || '').trim()) nextErrors.pucMarks = 'PUC total marks are required.';
        if (form.pucMarks && !/^\d+(\.\d{1,2})?$/.test(form.pucMarks)) nextErrors.pucMarks = 'Marks must be numeric.';
        if (form.pucPercentage && !/^\d+(\.\d{1,2})?$/.test(form.pucPercentage)) nextErrors.pucPercentage = 'Percentage must be numeric.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const finalErrors = {};
    const lateral = isLateral;

    // Check steps 0, 1, 3 base required fields
    [0, 1, 3].forEach((stepIdx) => {
      requiredByStep[stepIdx].forEach((field) => {
        if (!String(form[field] ?? '').trim()) finalErrors[field] = 'This field is required.';
      });
    });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) finalErrors.email = 'Enter a valid email address.';
    if (!/^\d{10}$/.test(form.studentContact)) finalErrors.studentContact = 'Phone number must contain 10 digits.';
    if (!/^\d{10}$/.test(form.parentContact)) finalErrors.parentContact = 'Phone number must contain 10 digits.';
    if (!/^\d{12}$/.test(form.aadhaarNumber)) finalErrors.aadhaarNumber = 'Aadhaar number must contain 12 digits.';

    if (form.studentId && students.some((s) => s.studentId?.toUpperCase() === form.studentId.trim().toUpperCase() && s._id !== editStudent?._id)) {
      finalErrors.studentId = 'Student ID is already in use.';
    }
    if (form.usn && students.some((s) => s.usn?.toUpperCase() === form.usn.trim().toUpperCase() && s._id !== editStudent?._id)) {
      finalErrors.usn = 'USN is already in use.';
    }
    if (form.admissionNumber && students.some((s) => s.admissionNumber?.toUpperCase() === form.admissionNumber.trim().toUpperCase() && s._id !== editStudent?._id)) {
      finalErrors.admissionNumber = 'Admission Number is already in use.';
    }
    if (students.some((s) => s.personalDetails?.cetNumber === form.cetNumber && s._id !== editStudent?._id)) {
      finalErrors.cetNumber = 'CET Number already exists.';
    }
    if (!isValidCETNumber(form.cetNumber)) finalErrors.cetNumber = 'CET Number must be 2 letters followed by 3 digits.';
    if (!isValidCETRank(form.cetRank)) finalErrors.cetRank = 'CET Rank must be a number from 1 to 1000000.';
    if (!/^\d+(\.\d{1,2})?$/.test(form.feeCollected)) finalErrors.feeCollected = 'Fee accepts decimal values.';
    ['feeCollectedIdp', 'feeCollectedVtu', 'feeCollectedPd'].forEach((field) => {
      if (form[field] && !/^\d+(\.\d{1,2})?$/.test(form[field])) finalErrors[field] = 'Fee accepts decimal values.';
    });

    // Step 2 conditional fields
    if (!String(form.qualifyingExam || '').trim()) finalErrors.qualifyingExam = 'Qualifying examination is required.';
    if (!String(form.state || '').trim()) finalErrors.state = 'State is required.';

    if (lateral) {
      if (!String(form.diplomaCollegeName || '').trim()) finalErrors.diplomaCollegeName = 'Diploma college name is required.';
      if (!String(form.diplomaBoard || '').trim()) finalErrors.diplomaBoard = 'Diploma board is required.';
      if (!String(form.diplomaRegNumber || '').trim()) finalErrors.diplomaRegNumber = 'Diploma registration number is required.';
      if (!String(form.diplomaPassingYear || '').trim()) finalErrors.diplomaPassingYear = 'Passing year is required.';
      if (!String(form.diplomaMarks || '').trim()) finalErrors.diplomaMarks = 'Diploma total marks are required.';
      if (form.diplomaMarks && !/^\d+(\.\d{1,2})?$/.test(form.diplomaMarks)) finalErrors.diplomaMarks = 'Marks must be numeric.';
    } else {
      if (!String(form.pucCollegeName || '').trim()) finalErrors.pucCollegeName = 'PUC college name is required.';
      if (!String(form.pucBoard || '').trim()) finalErrors.pucBoard = 'PUC board is required.';
      if (!String(form.pucRegNumber || '').trim()) finalErrors.pucRegNumber = 'PUC registration/exam number is required.';
      if (!String(form.pucPassingYear || '').trim()) finalErrors.pucPassingYear = 'Passing year is required.';
      if (!String(form.pucMarks || '').trim()) finalErrors.pucMarks = 'PUC total marks are required.';
      if (form.pucMarks && !/^\d+(\.\d{1,2})?$/.test(form.pucMarks)) finalErrors.pucMarks = 'Marks must be numeric.';
    }

    setErrors(finalErrors);
    return Object.keys(finalErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const submitForm = async () => {
    if (!validateAll()) {
      toast.error('Please fix the validation messages before submitting');
      setConfirmSubmit(false);
      return;
    }

    const lateral = isLateral;
    const payload = {
      studentId: form.studentId ? form.studentId.trim().toUpperCase() : undefined,
      usn: form.usn ? form.usn.trim().toUpperCase() : undefined,
      admissionNumber: form.admissionNumber ? form.admissionNumber.trim().toUpperCase() : undefined,
      admissionType: lateral ? 'Lateral Entry' : 'Regular',
      admissionBatch: Number(form.academicBatch.slice(0, 4)),
      personalDetails: {
        studentName: form.studentName.trim(),
        fatherName: form.fatherName.trim(),
        motherName: form.motherName.trim(),
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        religion: form.religion,
        category: form.category,
        subCaste: form.subCaste,
        physicallyChallenged: form.physicallyChallenged,
        aadhaarNumber: form.aadhaarNumber,
        cetNumber: form.cetNumber,
        cetRank: Number(form.cetRank)
      },
      familyDetails: {
        fatherName: form.fatherName.trim(),
        motherName: form.motherName.trim(),
        parentContact: form.parentContact,
        fatherOccupation: form.fatherOccupation,
        motherOccupation: form.motherOccupation,
        annualIncome: Number(form.annualIncome)
      },
      academicDetails: {
        qualifyingExam: form.qualifyingExam || (lateral ? 'Diploma' : 'PUC'),
        board: lateral ? form.diplomaBoard : form.pucBoard,
        state: form.state,
        region: form.region,
        allottedCategory: form.allottedCategory,
        branch: form.branch,
        feeCollected: Number(form.feeCollected),
        feeCollectedIdp: Number(form.feeCollectedIdp || 0),
        feeCollectedVtu: Number(form.feeCollectedVtu || 0),
        feeCollectedPd: Number(form.feeCollectedPd || 0),
        lateralEntry: lateral ? 'Yes' : 'No',
        distance: Number(form.distance),
        year: lateral ? 2 : 1,
        ...(lateral ? {
          diplomaCollegeName: form.diplomaCollegeName,
          diplomaBoard: form.diplomaBoard,
          diplomaRegNumber: form.diplomaRegNumber,
          diplomaPassingYear: Number(form.diplomaPassingYear) || undefined,
          diplomaMarks: Number(form.diplomaMarks) || undefined,
          diplomaPercentage: Number(form.diplomaPercentage || form.diplomaMarks) || undefined
        } : {
          pucCollegeName: form.pucCollegeName,
          pucBoard: form.pucBoard,
          pucRegNumber: form.pucRegNumber,
          pucPassingYear: Number(form.pucPassingYear) || undefined,
          pucMarks: Number(form.pucMarks) || undefined,
          pucPercentage: Number(form.pucPercentage || form.pucMarks) || undefined
        })
      },
      contactDetails: {
        studentContact: form.studentContact,
        email: form.email,
        permanentAddress: form.permanentAddress,
        correspondenceAddress: form.correspondenceAddress,
        sameAsPermanent: form.sameAsPermanent,
        defenceQuota: form.defenceQuota,
        sportsQuota: form.sportsQuota,
        snqQuota: form.snqQuota
      }
    };

    const wasEditing = Boolean(editStudent);

    try {
      if (editStudent) {
        await axios.put(`${API}/students/${editStudent._id}`, payload, { headers });
        toast.success('Admission record updated successfully');
      } else {
        const response = await axios.post(`${API}/admissions/new`, payload, { headers });
        setEnrollmentStudent(response.data.student);
        setEnrollment({
          batch: Number(form.academicBatch.slice(0, 4)),
          semester: lateral ? 3 : 1,
          section: 'A'
        });
        toast.success('Admission application created successfully!');
      }
      localStorage.removeItem(DRAFT_KEY);
      setForm(initialForm);
      setStep(0);
      setEditStudent(null);
      setConfirmSubmit(false);
      fetchStudents();
      if (wasEditing) setActiveTab('search');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to save admission');
    }
  };

  const editRecord = (student) => {
    setEditStudent(student);
    const lateral = student.admissionType === 'Lateral Entry' || student.academicDetails?.lateralEntry === 'Yes';
    const acad = student.academicDetails || {};
    const lat = student.lateralEntryDetails || {};

    setForm({
      ...initialForm,
      studentName: student.personalDetails?.studentName || '',
      studentId: student.studentId || '',
      usn: student.usn || '',
      admissionNumber: student.admissionNumber || '',
      fatherName: student.familyDetails?.fatherName || '',
      motherName: student.familyDetails?.motherName || '',
      dob: student.personalDetails?.dob ? student.personalDetails.dob.split('T')[0] : '',
      gender: student.personalDetails?.gender || 'Male',
      bloodGroup: student.personalDetails?.bloodGroup || 'O+',
      religion: student.personalDetails?.religion || '',
      category: student.personalDetails?.category || 'GM',
      subCaste: student.personalDetails?.subCaste || '',
      physicallyChallenged: student.personalDetails?.physicallyChallenged || 'No',
      aadhaarNumber: student.personalDetails?.aadhaarNumber || '',
      studentContact: student.contactDetails?.studentContact || '',
      parentContact: student.familyDetails?.parentContact || '',
      email: student.contactDetails?.email || '',
      cetNumber: student.personalDetails?.cetNumber || '',
      cetRank: String(student.personalDetails?.cetRank || ''),
      branch: acad.branch || 'CSE',
      allottedCategory: acad.allottedCategory || 'GM',
      defenceQuota: student.contactDetails?.defenceQuota || 'No',
      sportsQuota: student.contactDetails?.sportsQuota || 'No',
      snqQuota: student.contactDetails?.snqQuota || 'No',
      region: acad.region || 'Karnataka',
      feeCollected: String(acad.feeCollected || ''),
      feeCollectedIdp: String(acad.feeCollectedIdp || 0),
      feeCollectedVtu: String(acad.feeCollectedVtu || 0),
      feeCollectedPd: String(acad.feeCollectedPd || 0),
      annualIncome: String(student.familyDetails?.annualIncome || ''),
      distance: String(acad.distance || ''),
      admissionType: lateral ? 'Lateral Entry' : 'Regular',
      qualifyingExam: acad.qualifyingExam || (lateral ? 'Diploma' : 'PUC'),
      state: acad.state || 'Karnataka',
      academicBatch: student.admissionBatch ? (lateral ? `${student.admissionBatch}–${student.admissionBatch + 3}` : `${student.admissionBatch}–${student.admissionBatch + 4}`) : (lateral ? '2026–29' : '2026–30'),
      // Load PUC fields if regular
      pucCollegeName: acad.pucCollegeName || '',
      pucBoard: acad.pucBoard || acad.board || 'Karnataka State Pre-University Board',
      pucRegNumber: acad.pucRegNumber || '',
      pucPassingYear: acad.pucPassingYear ? String(acad.pucPassingYear) : '',
      pucMarks: acad.pucMarks ? String(acad.pucMarks) : '',
      pucPercentage: acad.pucPercentage ? String(acad.pucPercentage) : (acad.percentage ? String(acad.percentage) : ''),
      // Load Diploma fields if lateral entry
      diplomaCollegeName: acad.diplomaCollegeName || lat.previousInstitution || '',
      diplomaBoard: acad.diplomaBoard || lat.diplomaBoard || acad.board || 'Department of Technical Education, Karnataka',
      diplomaRegNumber: acad.diplomaRegNumber || lat.dcetNumber || '',
      diplomaPassingYear: acad.diplomaPassingYear ? String(acad.diplomaPassingYear) : '',
      diplomaMarks: acad.diplomaMarks ? String(acad.diplomaMarks) : (lat.diplomaTotalMarks ? String(lat.diplomaTotalMarks) : ''),
      diplomaPercentage: acad.diplomaPercentage ? String(acad.diplomaPercentage) : (lat.diplomaPercentage ? String(lat.diplomaPercentage) : ''),
      diplomaPassed: lateral ? 'Yes' : 'No',
      // Address & family
      permanentAddress: student.contactDetails?.permanentAddress || '',
      correspondenceAddress: student.contactDetails?.correspondenceAddress || '',
      sameAsPermanent: student.contactDetails?.sameAsPermanent || false,
      fatherOccupation: student.familyDetails?.fatherOccupation || '',
      motherOccupation: student.familyDetails?.motherOccupation || ''
    });
    setErrors({});
    setStep(0);
    setBatchSelected(true);
    setActiveTab('form');
  };

  const cancelEdit = () => {
    setEditStudent(null);
    setForm(initialForm);
    setBatchSelected(false);
    setErrors({});
    setActiveTab('search');
  };

  const deleteRecord = async () => {
    try {
      await axios.delete(`${API}/students/${deleteTarget._id}`, { headers });
      toast.success('Admission record deleted');
      setDeleteTarget(null);
      fetchStudents();
    } catch {
      toast.error('Delete failed');
    }
  };

  const completeEnrollment = async () => {
    if (!enrollmentStudent) return;
    try {
      const response = await axios.post(`${API}/students/${enrollmentStudent._id}/enroll`, {
        batch: enrollment.batch,
        semester: enrollment.semester,
        section: enrollment.section
      }, { headers });
      setEnrollmentStudent(null);
      setCredentials({ student: response.data.student, ...response.data.credentials });
      toast.success('Enrollment completed and login credential generated');
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to complete enrollment');
    }
  };

  const exportRows = filteredStudents.map((student) => [
    student.admissionNumber || 'Not Assigned',
    student.studentId || student.usn || 'Not Assigned',
    student.personalDetails?.studentName || '',
    student.personalDetails?.cetNumber || '',
    student.academicDetails?.branch || '',
    student.admissionType || 'Regular',
    student.personalDetails?.category || '',
    student.contactDetails?.studentContact || '',
    student.approvalStatus || 'Pending'
  ]);

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Student Admission Report', 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [['Admission Number', 'Student ID / USN', 'Student Name', 'CET Number', 'Branch', 'Admission Type', 'Category', 'Contact', 'Status']],
      body: exportRows,
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`admission_report_${Date.now()}.pdf`);
  };

  const exportExcel = () => {
    const header = ['Admission Number', 'Student ID / USN', 'Student Name', 'CET Number', 'Branch', 'Admission Type', 'Category', 'Contact', 'Status'];
    const html = [header, ...exportRows].map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/[<>]/g, '')}</td>`).join('')}</tr>`).join('');
    const blob = new Blob([`<table>${html}</table>`], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `admission_export_${Date.now()}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printStudent = (student) => {
    setViewStudent(student);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 shadow-xl print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <Link
                to="/dashboard/office/admissions"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20"
              >
                <ArrowLeft size={14} /> Back to Admissions
              </Link>
              <span className="text-slate-400 dark:text-slate-600 select-none">•</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Admission & Fee Management
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mt-1">Student Admission Module</h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'search'
                ? 'Search, review, and update existing admission records. Assign missing IDs or update educational details.'
                : 'Fast intake, validation, draft save, and registration for Regular and Lateral Entry admissions.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === 'form'} onClick={() => { setEditStudent(null); setActiveTab('form'); }} icon={UserPlus} label="New Admission" />
            <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={UserRoundCog} label="Update Admission" />
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={BarChart3} label="Analytics" />
          </div>
        </div>
      </div>

      {activeTab === 'form' && !batchSelected && (
        <div className="max-w-4xl mx-auto bg-slate-900/50 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-7 md:p-9 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
            <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center mb-5"><GraduationCap size={23} /></div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Admission workspace</p>
            <h3 className="text-2xl font-bold mt-2">Select batch before adding a student</h3>
            <p className="text-sm text-blue-100 mt-2 max-w-xl">
              Select Regular or Lateral Entry admission. Official Student ID, USN, and College Admission Number are optional during initial admission and can be entered later.
            </p>
          </div>
          <div className="p-7 md:p-9 space-y-6">
            <div className="grid md:grid-cols-3 gap-5">
              <SelectField
                label="Admission Type"
                value={form.admissionType}
                onChange={(v) => updateField('admissionType', v)}
                options={['Regular', 'Lateral Entry']}
              />
              <SelectField
                label="Academic Batch"
                value={availableBatches.includes(form.academicBatch) ? form.academicBatch : availableBatches[0]}
                onChange={(v) => updateField('academicBatch', v)}
                options={availableBatches}
              />
              <SelectField
                label="Branch"
                value={form.branch}
                onChange={(v) => updateField('branch', v)}
                options={branches}
              />
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 flex gap-3 text-xs text-slate-300">
              <ShieldCheck className="text-emerald-400 shrink-0" size={18} />
              <span><strong className="text-slate-100">Intelligent Context Enabled:</strong> Relevant educational details ({isLateral ? 'Diploma' : 'PUC / 12th'}) and academic batch are loaded automatically.</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
                <CalendarDays size={15} /> {form.admissionType} ({isLateral ? 'Direct 2nd Year' : '1st Year'})
              </div>
              <button
                onClick={startAdmission}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
              >
                Continue to student details <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'form' && batchSelected && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden backdrop-blur-xl">
          <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 print:hidden">
            {editStudent && (
              <div className="mb-4 p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-300 flex items-center justify-between gap-3">
                <span>
                  <strong>Update Admission Mode:</strong> Editing student record for <strong className="text-white">{editStudent.personalDetails?.studentName}</strong>. You can update any fields or assign official identifiers now.
                </span>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors shrink-0"
                >
                  Cancel Edit
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {editStudent ? `Update Admission: ${editStudent.personalDetails?.studentName}` : 'New Admission Entry'}
                </h3>
                <p className="text-xs text-slate-400">
                  {form.admissionType} • {form.academicBatch} • {form.branch}{' '}
                  {!editStudent && (
                    <button onClick={() => setBatchSelected(false)} className="ml-1 text-blue-400 font-bold hover:underline">
                      Change Batch/Type
                    </button>
                  )}
                </p>
              </div>
              <span className="text-xs font-bold text-blue-400">{completion}% Complete</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${completion}%` }}></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
              {steps.map((label, index) => (
                <button
                  key={label}
                  onClick={() => index <= step && setStep(index)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    index === step
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : index < step
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {index + 1}. {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {step === 0 && (
              <FormGrid title="Step 1: Personal Details">
                <Field label="Student Name" value={form.studentName} onChange={(v) => updateField('studentName', v)} error={errors.studentName} required />
                <Field label="Father's Name" value={form.fatherName} onChange={(v) => updateField('fatherName', v)} error={errors.fatherName} required />
                <Field label="Mother's Name" value={form.motherName} onChange={(v) => updateField('motherName', v)} error={errors.motherName} required />
                <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => updateField('dob', v)} error={errors.dob} required />
                <SelectField label="Gender" value={form.gender} onChange={(v) => updateField('gender', v)} options={['Male', 'Female', 'Other']} error={errors.gender} />
                <SelectField label="Blood Group" value={form.bloodGroup} onChange={(v) => updateField('bloodGroup', v)} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} error={errors.bloodGroup} />
                <Field label="Religion" value={form.religion} onChange={(v) => updateField('religion', v)} error={errors.religion} required />
                <SelectField label="Category" value={form.category} onChange={(v) => updateField('category', v)} options={['GM', 'OBC', 'SC', 'ST', 'Cat-1', '2A', '2B', '3A', '3B']} error={errors.category} />
                <Field label="Sub-Caste" value={form.subCaste} onChange={(v) => updateField('subCaste', v)} error={errors.subCaste} />
                <SelectField label="Physically Challenged" value={form.physicallyChallenged} onChange={(v) => updateField('physicallyChallenged', v)} options={['No', 'Yes']} error={errors.physicallyChallenged} />
                <Field label="Aadhaar Number" value={form.aadhaarNumber} onChange={(v) => updateField('aadhaarNumber', v.replace(/\D/g, '').slice(0, 12))} error={errors.aadhaarNumber} required />
                <Field label="Student Contact Number" value={form.studentContact} onChange={(v) => updateField('studentContact', v.replace(/\D/g, '').slice(0, 10))} error={errors.studentContact} required />
                <Field label="Parent Contact Number" value={form.parentContact} onChange={(v) => updateField('parentContact', v.replace(/\D/g, '').slice(0, 10))} error={errors.parentContact} required />
                <Field label="Email ID" type="email" value={form.email} onChange={(v) => updateField('email', v)} error={errors.email} required />
              </FormGrid>
            )}

            {step === 1 && (
              <FormGrid title="Step 2: Admission & Reservation Details">
                <div className="md:col-span-2 xl:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
                  {[['Course', 'B.E. / B.Tech'], ['Admission type', form.admissionType], ['Academic batch', form.academicBatch], ['Branch', form.branch]].map(([label, value]) => (
                    <div key={label} className="px-2">
                      <span className="block text-[10px] uppercase tracking-wide font-bold text-slate-400">{label}</span>
                      <span className="text-xs font-bold text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Optional Identifiers - Not mandatory at admission */}
                <Field
                  label="Student ID (Optional)"
                  placeholder="e.g. 4HG26CS001 (can be assigned later)"
                  value={form.studentId}
                  onChange={(v) => updateField('studentId', v.toUpperCase())}
                  error={errors.studentId}
                />
                <Field
                  label="USN (Optional)"
                  placeholder="e.g. 4HG26CS001 (can be assigned later)"
                  value={form.usn}
                  onChange={(v) => updateField('usn', v.toUpperCase())}
                  error={errors.usn}
                />
                <Field
                  label="College Admission Number (Optional)"
                  placeholder="e.g. GECM/2026/CS/001 (can be assigned later)"
                  value={form.admissionNumber}
                  onChange={(v) => updateField('admissionNumber', v.toUpperCase())}
                  error={errors.admissionNumber}
                />

                <Field label="CET Number" value={form.cetNumber} onChange={(v) => updateField('cetNumber', sanitizeCETNumber(v).slice(0, 5))} error={errors.cetNumber} required />
                <Field label="CET Rank" value={form.cetRank} onChange={(v) => updateField('cetRank', sanitizeCETRank(v))} error={errors.cetRank} required />
                <SelectField label="Branch (Selected)" value={form.branch} onChange={(v) => updateField('branch', v)} options={branches} error={errors.branch} disabled />
                <SelectField label="Allotted Category" value={form.allottedCategory} onChange={(v) => updateField('allottedCategory', v)} options={['GM', 'OBC', 'SC', 'ST', 'Cat-1', '2A', '2B', '3A', '3B']} error={errors.allottedCategory} />
                <SelectField label="Defence Quota" value={form.defenceQuota} onChange={(v) => updateField('defenceQuota', v)} options={['No', 'Yes']} />
                <SelectField label="Sports Quota" value={form.sportsQuota} onChange={(v) => updateField('sportsQuota', v)} options={['No', 'Yes']} />
                <SelectField label="SNQ Quota" value={form.snqQuota} onChange={(v) => updateField('snqQuota', v)} options={['No', 'Yes']} />
                <SelectField label="Region" value={form.region} onChange={(v) => updateField('region', v)} options={['Karnataka', 'Hyderabad-Karnataka', 'Non-Karnataka']} error={errors.region} />
                <Field label="Fee Collected at KEA (₹)" value={form.feeCollected} onChange={(v) => updateField('feeCollected', v.replace(/[^\d.]/g, ''))} error={errors.feeCollected} required />
                <Field label="Annual Family Income (₹)" value={form.annualIncome} onChange={(v) => updateField('annualIncome', v.replace(/[^\d.]/g, ''))} error={errors.annualIncome} required />
                <Field label="Distance from College (km)" value={form.distance} onChange={(v) => updateField('distance', v.replace(/[^\d.]/g, ''))} error={errors.distance} required />
              </FormGrid>
            )}

            {step === 2 && (
              <FormGrid title={isLateral ? 'Step 3: Previous Education Details (Diploma / Lateral Entry)' : 'Step 3: Previous Education Details (PUC / 12th Standard)'}>
                <Field
                  label="Qualifying Examination"
                  value={form.qualifyingExam}
                  onChange={(v) => updateField('qualifyingExam', v)}
                  error={errors.qualifyingExam}
                  required
                />
                <Field
                  label="State of Examination"
                  value={form.state}
                  onChange={(v) => updateField('state', v)}
                  error={errors.state}
                  required
                />

                {isLateral ? (
                  // Lateral Entry: Diploma educational details only
                  <>
                    <Field
                      label="Diploma College / Polytechnic Name"
                      placeholder="e.g. Government Polytechnic, Hassan"
                      value={form.diplomaCollegeName}
                      onChange={(v) => updateField('diplomaCollegeName', v)}
                      error={errors.diplomaCollegeName}
                      required
                    />
                    <Field
                      label="Diploma Board / Examining Body"
                      placeholder="e.g. DTE Karnataka"
                      value={form.diplomaBoard}
                      onChange={(v) => updateField('diplomaBoard', v)}
                      error={errors.diplomaBoard}
                      required
                    />
                    <Field
                      label="Diploma Registration Number"
                      placeholder="e.g. 123CS20001"
                      value={form.diplomaRegNumber}
                      onChange={(v) => updateField('diplomaRegNumber', v.toUpperCase())}
                      error={errors.diplomaRegNumber}
                      required
                    />
                    <Field
                      label="Diploma Passing Year"
                      placeholder="e.g. 2026"
                      value={form.diplomaPassingYear}
                      onChange={(v) => updateField('diplomaPassingYear', v.replace(/\D/g, '').slice(0, 4))}
                      error={errors.diplomaPassingYear}
                      required
                    />
                    <Field
                      label="Diploma Total Marks (Aggregate)"
                      placeholder="e.g. 3600"
                      value={form.diplomaMarks}
                      onChange={(v) => updateField('diplomaMarks', v.replace(/[^\d.]/g, ''))}
                      error={errors.diplomaMarks}
                      required
                    />
                    <Field
                      label="Diploma Percentage (%)"
                      placeholder="e.g. 84.50"
                      value={form.diplomaPercentage}
                      onChange={(v) => updateField('diplomaPercentage', v.replace(/[^\d.]/g, ''))}
                      error={errors.diplomaPercentage}
                    />
                  </>
                ) : (
                  // Regular Admission: PUC educational details only
                  <>
                    <Field
                      label="PUC / 12th College Name"
                      placeholder="e.g. Government PU College, Hassan"
                      value={form.pucCollegeName}
                      onChange={(v) => updateField('pucCollegeName', v)}
                      error={errors.pucCollegeName}
                      required
                    />
                    <Field
                      label="PUC / 12th Board"
                      placeholder="e.g. Karnataka State Pre-University Board"
                      value={form.pucBoard}
                      onChange={(v) => updateField('pucBoard', v)}
                      error={errors.pucBoard}
                      required
                    />
                    <Field
                      label="PUC Registration / Examination Number"
                      placeholder="e.g. 452102"
                      value={form.pucRegNumber}
                      onChange={(v) => updateField('pucRegNumber', v.toUpperCase())}
                      error={errors.pucRegNumber}
                      required
                    />
                    <Field
                      label="PUC Passing Year"
                      placeholder="e.g. 2026"
                      value={form.pucPassingYear}
                      onChange={(v) => updateField('pucPassingYear', v.replace(/\D/g, '').slice(0, 4))}
                      error={errors.pucPassingYear}
                      required
                    />
                    <Field
                      label="PUC Total Marks"
                      placeholder="e.g. 540"
                      value={form.pucMarks}
                      onChange={(v) => updateField('pucMarks', v.replace(/[^\d.]/g, ''))}
                      error={errors.pucMarks}
                      required
                    />
                    <Field
                      label="PUC Percentage (%)"
                      placeholder="e.g. 90.00"
                      value={form.pucPercentage}
                      onChange={(v) => updateField('pucPercentage', v.replace(/[^\d.]/g, ''))}
                      error={errors.pucPercentage}
                    />
                  </>
                )}
              </FormGrid>
            )}

            {step === 3 && (
              <FormGrid title="Step 4: Address & Family Details">
                <TextArea label="Permanent Address" value={form.permanentAddress} onChange={(v) => updateField('permanentAddress', v)} error={errors.permanentAddress} required />
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3 cursor-pointer">
                    <input type="checkbox" checked={form.sameAsPermanent} onChange={(e) => updateField('sameAsPermanent', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    Same as Permanent Address
                  </label>
                  <TextArea label="Correspondence Address" value={form.correspondenceAddress} onChange={(v) => updateField('correspondenceAddress', v)} error={errors.correspondenceAddress} required disabled={form.sameAsPermanent} />
                </div>
                <Field label="Father's Occupation" value={form.fatherOccupation} onChange={(v) => updateField('fatherOccupation', v)} error={errors.fatherOccupation} required />
                <Field label="Mother's Occupation" value={form.motherOccupation} onChange={(v) => updateField('motherOccupation', v)} error={errors.motherOccupation} required />
              </FormGrid>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 mt-6 border-t border-slate-800 print:hidden">
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ArrowLeft size={16} /> Previous
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => validateAll() && setConfirmSubmit(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
                >
                  {editStudent ? 'Save Changes' : 'Save & Set Up Student Login'} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPDATE ADMISSION TAB */}
      {activeTab === 'search' && (
        <div className="space-y-5">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-lg print:hidden">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, CET, Aadhaar, Student ID, USN, Admission Number, contact, branch..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-200 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="All" className="bg-slate-900 text-slate-100">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch} className="bg-slate-900 text-slate-100">{branch}</option>
                ))}
              </select>
              <button onClick={downloadPdf} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
                <FileDown size={16} /> PDF
              </button>
              <button onClick={exportExcel} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors">
                <Download size={16} /> Excel
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading admission records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">Admission Number</th>
                      <th className="p-4">Student ID / USN</th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">CET Number</th>
                      <th className="p-4">Branch</th>
                      <th className="p-4">Admission Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-12 text-center text-slate-400 text-xs">
                          {searchQuery ? `No admission records matching "${searchQuery}"` : 'No admission records found.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((student) => {
                        const admType = student.admissionType || (student.academicDetails?.lateralEntry === 'Yes' ? 'Lateral Entry' : 'Regular');
                        const isStudentLateral = admType === 'Lateral Entry';
                        return (
                          <tr key={student._id} className="hover:bg-slate-800/30 text-slate-200 transition-colors">
                            <td className="p-4 font-bold text-blue-400">
                              {student.admissionNumber ? (
                                student.admissionNumber
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Not Assigned
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-300 font-mono text-xs">
                              {student.studentId || student.usn ? (
                                student.studentId || student.usn
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  Pending ID
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-slate-100">
                              {student.personalDetails?.studentName || student.studentName}
                            </td>
                            <td className="p-4 text-slate-300">
                              {student.personalDetails?.cetNumber || '-'}
                            </td>
                            <td className="p-4 text-slate-300">
                              {student.academicDetails?.branch || '-'}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isStudentLateral
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                }`}
                              >
                                {admType}
                              </span>
                            </td>
                            <td className="p-4">
                              <Status status={student.approvalStatus} />
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => editRecord(student)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold transition-colors mr-1.5"
                                title="Update Admission details and assign official IDs"
                              >
                                <Edit2 size={13} /> Update
                              </button>
                              <Action icon={FileText} title="View Record" onClick={() => setViewStudent(student)} />
                              {student.approvalStatus === 'Pending' && (
                                <Action
                                  icon={CheckCircle}
                                  title="Complete enrollment"
                                  onClick={() => {
                                    setEnrollmentStudent(student);
                                    setEnrollment({ batch: new Date().getFullYear(), semester: isStudentLateral ? 3 : 1, section: 'A' });
                                  }}
                                />
                              )}
                              {student.approvalStatus === 'Approved' && (
                                <Action
                                  icon={KeyRound}
                                  title="View login credential"
                                  onClick={async () => {
                                    const targetId = student._id || student.id || student.studentId;
                                    try {
                                      const response = await axios.get(`${API}/students/${targetId}/credentials`, { headers });
                                      setCredentials({ student, ...response.data });
                                    } catch {
                                      setCredentials({
                                        student,
                                        studentName: student.personalDetails?.studentName || student.studentName || 'Student',
                                        username: student.studentId || student.id || 'CET2026',
                                        password: student.credentials?.initialPassword || student.securityDetails?.password || 'student123'
                                      });
                                    }
                                  }}
                                />
                              )}
                              <Action icon={Printer} title="Print Admission Form" onClick={() => printStudent(student)} />
                              <Action icon={Trash2} title="Delete Record" onClick={() => setDeleteTarget(student)} danger />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 print:hidden">
            <span className="text-xs text-slate-400">
              Showing {paginatedStudents.length} of {filteredStudents.length} records
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/20">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD ANALYTICS TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Total Admissions" value={stats.total} icon={Users} />
            <StatCard label="Branches" value={Object.keys(stats.branchWise).length} icon={BarChart3} />
            <StatCard label="Categories" value={Object.keys(stats.categoryWise).length} icon={BarChart3} />
            <StatCard label="Quota Admissions" value={stats.quotaWise.Defence + stats.quotaWise.Sports + stats.quotaWise.SNQ} icon={BarChart3} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <StatsPanel title="Branch-wise Admissions" data={stats.branchWise} />
            <StatsPanel title="Category-wise Admissions" data={stats.categoryWise} />
            <StatsPanel title="Quota-wise Statistics" data={stats.quotaWise} />
          </div>
        </div>
      )}

      {/* CONFIRM SAVE MODAL */}
      {confirmSubmit && (
        <Modal title={editStudent ? 'Confirm Admission Update' : 'Confirm Admission Submission'} onClose={() => setConfirmSubmit(false)}>
          <p className="text-sm text-slate-300 mb-5">
            {editStudent
              ? `Save changes to ${editStudent.personalDetails?.studentName || 'this student'}'s admission record? Existing records will be preserved and updated in place.`
              : 'Save this admission record? For a new student, the final enrollment step will then generate login credentials and open face registration.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmSubmit(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitForm}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              {editStudent ? 'Save Changes' : 'Confirm Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ENROLLMENT MODAL */}
      {enrollmentStudent && (
        <Modal title="Complete Student Enrollment" onClose={() => setEnrollmentStudent(null)}>
          <p className="text-sm text-slate-300 mb-4">
            Approve <strong className="text-slate-100">{enrollmentStudent.personalDetails?.studentName}</strong>, assign the academic batch, and create the student login.
          </p>
          <div className="space-y-3">
            <Field
              label="Admission Batch (start year)"
              type="number"
              value={enrollment.batch}
              onChange={(value) => setEnrollment((prev) => ({ ...prev, batch: Number(value) }))}
              required
            />
            <Field
              label="Joining Semester"
              type="number"
              value={enrollment.semester}
              onChange={(value) => setEnrollment((prev) => ({ ...prev, semester: Number(value) }))}
              required
            />
            <Field
              label="Section"
              value={enrollment.section}
              onChange={(value) => setEnrollment((prev) => ({ ...prev, section: value.toUpperCase().slice(0, 1) }))}
              required
            />
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setEnrollmentStudent(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={completeEnrollment}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              Approve & Generate
            </button>
          </div>
        </Modal>
      )}

      {/* CREDENTIALS MODAL */}
      {credentials && (
        <Modal title="Student Login Credential" onClose={() => setCredentials(null)}>
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-100">
              {credentials.student?.personalDetails?.studentName || credentials.studentName}
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Username / ID</span>
                <code className="font-bold text-blue-400">{credentials.username || credentials.studentId || 'Not set'}</code>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Initial password</span>
                <code className="font-bold text-blue-400">{credentials.password || 'Already changed by student'}</code>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Give this credential to the student securely. Face registration can also be completed by office staff.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors"
              >
                Print
              </button>
              <button
                onClick={() => navigate('/dashboard/office/facerec', { state: { studentId: credentials.student?._id } })}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Camera size={15} /> Register Face
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewStudent && <AdmissionFormModal student={viewStudent} onClose={() => setViewStudent(null)} />}

      {deleteTarget && (
        <Modal title="Delete Admission Record" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-300 mb-5">
            Delete <strong className="text-slate-100">{deleteTarget.personalDetails?.studentName}</strong>'s admission record?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={deleteRecord}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
        active
          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function FormGrid({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, error, placeholder, type = 'text', required = false, disabled = false }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-300">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors ${
          error ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'border-slate-800'
        }`}
      />
      {error && <span className="text-[11px] text-rose-400 mt-1 block font-medium">{error}</span>}
    </label>
  );
}

function SelectField({ label, value, onChange, options, error, disabled = false }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-300">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors ${
          error ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'border-slate-800'
        }`}
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-900 text-slate-100">
            {option}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-rose-400 mt-1 block font-medium">{error}</span>}
    </label>
  );
}

function TextArea({ label, value, onChange, error, required = false, disabled = false }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-300">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors ${
          error ? 'border-rose-500/80 ring-1 ring-rose-500/40' : 'border-slate-800'
        }`}
      />
      {error && <span className="text-[11px] text-rose-400 mt-1 block font-medium">{error}</span>}
    </label>
  );
}

function Status({ status }) {
  const tone =
    status === 'Approved'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : status === 'Rejected'
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  return <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${tone}`}>{status || 'Pending'}</span>;
}

function Action({ icon: Icon, onClick, title, danger = false }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex p-1.5 rounded-lg mr-1 border transition-colors ${
        danger ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10' : 'border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-blue-400" />
      </div>
      <div className="text-2xl font-bold text-slate-100 mt-3">{value}</div>
    </div>
  );
}

function StatsPanel({ title, data }) {
  const max = Math.max(1, ...Object.values(data));
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
      <h3 className="text-sm font-bold text-slate-100 mb-4">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).length === 0 ? (
          <p className="text-xs text-slate-500">No data yet.</p>
        ) : (
          Object.entries(data).map(([label, value]) => (
            <div key={label}>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>{label}</span>
                <span className="text-slate-100">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(value / max) * 100}%` }}></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AdmissionFormModal({ student, onClose }) {
  const isLateral = student.admissionType === 'Lateral Entry' || student.academicDetails?.lateralEntry === 'Yes';
  const acad = student.academicDetails || {};
  const lat = student.lateralEntryDetails || {};

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 my-8 print:shadow-none print:max-w-none print:rounded-none print:bg-white print:text-black">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5 print:hidden">
          <h3 className="font-bold text-slate-100">Printable Admission Form</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors">
              Print / PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Government Engineering College, Mosalehosahalli</h1>
          <p className="text-sm font-semibold text-blue-400 mt-1">Student Admission Record ({student.admissionType || (isLateral ? 'Lateral Entry' : 'Regular')})</p>
          <p className="text-xs text-slate-400 mt-1">
            Admission Number: <span className="font-bold text-slate-200">{student.admissionNumber || 'Not Assigned'}</span>
            {' • '}
            Student ID / USN: <span className="font-bold text-slate-200">{student.studentId || student.usn || 'Not Assigned'}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <PrintRow label="Student Name" value={student.personalDetails?.studentName} />
          <PrintRow label="Admission Type" value={student.admissionType || (isLateral ? 'Lateral Entry' : 'Regular')} />
          <PrintRow label="CET Number" value={student.personalDetails?.cetNumber} />
          <PrintRow label="CET Rank" value={student.personalDetails?.cetRank} />
          <PrintRow label="Branch" value={student.academicDetails?.branch} />
          <PrintRow label="Allotted Category" value={student.academicDetails?.allottedCategory || student.personalDetails?.category} />
          <PrintRow label="Aadhaar Number" value={student.personalDetails?.aadhaarNumber} />
          <PrintRow label="Date of Birth" value={student.personalDetails?.dob ? new Date(student.personalDetails.dob).toLocaleDateString('en-GB') : '-'} />
          <PrintRow label="Father's Name" value={student.familyDetails?.fatherName} />
          <PrintRow label="Mother's Name" value={student.familyDetails?.motherName} />
          <PrintRow label="Student Contact" value={student.contactDetails?.studentContact} />
          <PrintRow label="Parent Contact" value={student.familyDetails?.parentContact} />
          <PrintRow label="Email" value={student.contactDetails?.email} />
          <PrintRow label="Fee Collected at KEA" value={`₹ ${Number(student.academicDetails?.feeCollected || 0).toLocaleString('en-IN')}`} />
          {isLateral ? (
            <>
              <PrintRow label="Diploma College" value={acad.diplomaCollegeName || lat.previousInstitution || '-'} />
              <PrintRow label="Diploma Board" value={acad.diplomaBoard || lat.diplomaBoard || acad.board || '-'} />
              <PrintRow label="Diploma Reg Number" value={acad.diplomaRegNumber || lat.dcetNumber || '-'} />
              <PrintRow label="Diploma Marks / %" value={`${acad.diplomaMarks || lat.diplomaTotalMarks || '-'} (${acad.diplomaPercentage || lat.diplomaPercentage || '-'}%)`} />
            </>
          ) : (
            <>
              <PrintRow label="PUC / 12th College" value={acad.pucCollegeName || '-'} />
              <PrintRow label="PUC / 12th Board" value={acad.pucBoard || acad.board || '-'} />
              <PrintRow label="PUC Reg Number" value={acad.pucRegNumber || '-'} />
              <PrintRow label="PUC Marks / %" value={`${acad.pucMarks || '-'} (${acad.pucPercentage || acad.percentage || '-'}%)`} />
            </>
          )}
          <PrintRow label="Admission Status" value={student.approvalStatus} />
          <PrintRow label="Permanent Address" value={student.contactDetails?.permanentAddress} wide />
          <PrintRow label="Correspondence Address" value={student.contactDetails?.correspondenceAddress} wide />
        </div>
      </div>
    </div>
  );
}

function PrintRow({ label, value, wide = false }) {
  return (
    <div className={`border border-slate-800/80 rounded-xl p-3 bg-slate-950/40 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">{label}</span>
      <span className="text-slate-100 font-semibold">{value || '-'}</span>
    </div>
  );
}
