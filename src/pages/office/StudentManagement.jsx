import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Eye, Upload, X, ShieldAlert, FileText, User, KeyRound, ScanFace } from 'lucide-react';
import { sanitizeCETNumber, sanitizeCETRank } from '../../utils/cetValidation';
import * as XLSX from 'xlsx';

const getStudentStudyYear = (student) => {
  const batchYear = Number(student.admissionBatch);
  const academicStartYear = Number(String(student.currentAcademicYear || '').match(/^(\d{4})/)?.[1]);
  if (student.admissionType !== 'Lateral Entry' && Number.isInteger(batchYear) && Number.isInteger(academicStartYear)) {
    return Math.min(4, Math.max(1, academicStartYear - batchYear + 1));
  }
  return Number(student.currentStudyYear || student.academicDetails?.year || 1);
};

export default function StudentManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterFee, setFilterFee] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importSheet, setImportSheet] = useState({ headers: [], rows: [] });
  const [importing, setImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [credentials, setCredentials] = useState(null);

  // Settings metadata
  const [branches, setBranches] = useState(['CSE', 'ECE', 'EEE', 'ME', 'CE', 'AI&DS', 'ISE']);

  // Form states
  const emptyForm = {
    studentId: '',
    admissionNumber: '',
    personalDetails: { cetNumber: '', cetRank: '', studentName: '', dob: '', gender: 'Male', bloodGroup: 'O+', religion: 'Hindu', category: 'General', subCaste: '', aadhaarNumber: '', physicallyChallenged: 'No' },
    familyDetails: { fatherName: '', motherName: '', parentContact: '', fatherOccupation: '', motherOccupation: '', annualIncome: '' },
    academicDetails: { qualifyingExam: 'PUC', board: 'State Board', state: 'Karnataka', region: 'Urban', allottedCategory: 'General', branch: 'CSE', feeCollected: '0', lateralEntry: 'No' },
    contactDetails: { studentContact: '', email: '', permanentAddress: '', correspondenceAddress: '', sameAsPermanent: true },
    documents: { aadhaar: '', marksCard: '', photo: '' }
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchStudents();
    fetchSettings();
  }, [filterBranch, filterYear, filterBatch, filterFee]);

  useEffect(() => {
    const verifiedId = location.state?.faceVerifiedStudentId;
    if (!verifiedId) return;
    setSearchQuery(verifiedId);
    fetchStudentsByQuery(verifiedId);
  }, [location.state]);

  useEffect(() => {
    setCurrentPage(1);
  }, [students.length, searchQuery, filterBranch, filterYear, filterBatch, filterFee]);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return students.slice(start, start + pageSize);
  }, [students, currentPage]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/students', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search: searchQuery,
          branch: filterBranch,
          year: filterYear,
          batch: filterBatch,
          feeStatus: filterFee
        }
      });
      setStudents(res.data);
    } catch (err) {
      toast.error('Failed to load students directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.departments) setBranches(res.data.departments);
    } catch (err) {
      console.log('Error loading settings departments');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const fetchStudentsByQuery = async (search) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/students', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, branch: filterBranch, year: filterYear, batch: filterBatch, feeStatus: filterFee }
      });
      setStudents(res.data);
      toast.success('Face verified. The matching student is ready for admission update.');
    } catch {
      toast.error('Unable to open the verified student record');
    } finally {
      setLoading(false);
    }
  };

  const viewCredentials = async (student) => {
    const studentIdParam = student._id || student.id || student.studentId;
    try {
      const res = await axios.get(`/api/office/students/${studentIdParam}/credentials`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setCredentials({
        studentName: res.data.studentName || student.personalDetails?.studentName || student.name || 'Student',
        username: res.data.username || student.studentId || student.id || 'CET2026',
        password: res.data.password || student.credentials?.initialPassword || student.securityDetails?.password || 'student123'
      });
    } catch (error) {
      setCredentials({
        studentName: student.personalDetails?.studentName || student.name || 'Student',
        username: student.studentId || student.id || 'CET2026',
        password: student.credentials?.initialPassword || student.securityDetails?.password || 'student123'
      });
    }
  };

  const printCredentials = () => window.print();

  // Convert File to Base64
  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [field]: reader.result
        }
      }));
      toast.success(`${field.toUpperCase()} document uploaded locally`);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        studentId: formData.studentId?.trim() || '',
        admissionNumber: formData.admissionNumber?.trim() || ''
      };

      await axios.post('/api/office/students', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Student manually registered successfully!');
      setShowAddModal(false);
      setFormData(emptyForm);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  const importHeaders = [
    'studentId', 'admissionNumber', 'studentName', 'cetNumber', 'cetRank', 'dob', 'gender',
    'bloodGroup', 'religion', 'category', 'subCaste', 'aadhaarNumber', 'physicallyChallenged',
    'fatherName', 'motherName', 'parentContact', 'fatherOccupation', 'motherOccupation', 'annualIncome',
    'qualifyingExam', 'board', 'state', 'region', 'allottedCategory', 'branch', 'year', 'semester', 'section',
    'feeCollected', 'feeCollectedIdp', 'feeCollectedVtu', 'feeCollectedPd', 'percentage', 'diplomaMarks',
    'lateralEntry', 'studentContact', 'email', 'permanentAddress', 'correspondenceAddress', 'sameAsPermanent',
    'defenceQuota', 'sportsQuota', 'snqQuota', 'admissionBatch', 'admissionType', 'admissionQuota'
  ];

  const pucSampleRow = [
    'STU-2026-001', 'ADM-2026-001', 'Aarav Sharma', '2026CS101', '4520', '2006-05-14', 'Male',
    'O+', 'Hindu', 'General', '', '999912345678', 'No',
    'Rajesh Sharma', 'Sunita Sharma', '9876543210', 'Business', 'Teacher', '450000',
    'PUC', 'Karnataka State Board', 'Karnataka', 'Urban', 'General', 'CSE', 1, 1, 'A',
    85000, 50000, 25000, 10000, 89.50, '',
    'No', '9123456780', 'aarav.sharma@example.com', '123 MG Road, Bengaluru, Karnataka', '123 MG Road, Bengaluru, Karnataka', 'true',
    'No', 'No', 'No', 2026, 'Regular', 'CET'
  ];

  const lateralSampleRow = [
    'LAT-2026-001', 'ADM-LAT-2026-001', 'Priya Patil', 'DCET2026EC045', '840', '2005-03-22', 'Female',
    'B+', 'Hindu', 'OBC', '3A', '999987654321', 'No',
    'Suresh Patil', 'Rekha Patil', '9845012345', 'Farmer', 'Homemaker', '240000',
    'Diploma', 'DTE Karnataka', 'Karnataka', 'Rural', 'OBC', 'ECE', 2, 3, 'B',
    75000, 45000, 20000, 10000, 88.40, 88.40,
    'Yes', '9845098765', 'priya.patil@example.com', '45 Main Road, Hubballi, Karnataka', '45 Main Road, Hubballi, Karnataka', 'true',
    'No', 'No', 'No', 2026, 'Lateral Entry', 'Lateral Entry'
  ];

  const downloadImportTemplate = () => {
    const book = XLSX.utils.book_new();

    // 1. PUC / Regular Entry Worksheet
    const pucSheet = XLSX.utils.aoa_to_sheet([importHeaders, pucSampleRow]);
    pucSheet['!cols'] = importHeaders.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(book, pucSheet, 'PUC_Regular_Admissions');

    // 2. Lateral Entry (Diploma) Worksheet
    const lateralSheet = XLSX.utils.aoa_to_sheet([importHeaders, lateralSampleRow]);
    lateralSheet['!cols'] = importHeaders.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(book, lateralSheet, 'Lateral_Entry_Admissions');

    // 3. Instructions Guide Worksheet
    const instructions = [
      ['Field Name', 'Required', 'Format / Expected Values', 'PUC Level Notes', 'Lateral Entry Notes'],
      ['studentId', 'Yes', 'Text (e.g. STU-2026-001, LAT-2026-001)', 'Unique enrollment ID or USN', 'Unique lateral student ID'],
      ['admissionNumber', 'Yes', 'Text (e.g. ADM-2026-001)', 'Assigned college admission number', 'Assigned lateral admission number'],
      ['studentName', 'Yes', 'Text', 'Candidate Full Name', 'Candidate Full Name'],
      ['cetNumber', 'Yes', 'Text (Alphanumeric)', 'KCET number e.g. 2026CS101', 'DCET / Lateral entry number e.g. DCET2026EC045'],
      ['cetRank', 'Yes', 'Integer (1 - 1000000)', 'KCET Rank', 'DCET Merit Rank'],
      ['dob', 'Yes', 'YYYY-MM-DD', 'Date of birth', 'Date of birth'],
      ['gender', 'Yes', 'Male / Female / Other', 'Gender', 'Gender'],
      ['qualifyingExam', 'Yes', 'PUC / 12th / Diploma', 'Enter "PUC" or "12th"', 'Enter "Diploma"'],
      ['year', 'Yes', 'Integer (1 - 4)', 'Enter 1 for 1st Year Regular', 'Enter 2 for 2nd Year Lateral Entry'],
      ['semester', 'Yes', 'Integer (1 - 8)', 'Enter 1 (or 2)', 'Enter 3 (Direct 3rd Semester)'],
      ['lateralEntry', 'Yes', 'Yes / No', 'Enter "No"', 'Enter "Yes"'],
      ['percentage', 'Yes', 'Decimal (e.g. 89.50)', 'PUC / 12th percentage marks', 'Diploma overall percentage'],
      ['diplomaMarks', 'Lateral only', 'Decimal (e.g. 88.40)', 'Leave blank for PUC', 'Diploma percentage / marks'],
      ['feeCollected', 'Yes', 'Numeric amount in INR', 'Total fee collected at admission', 'Total fee collected at admission'],
      ['admissionType', 'Yes', 'Regular / Lateral Entry', 'Enter "Regular"', 'Enter "Lateral Entry"'],
      ['admissionQuota', 'Yes', 'CET / Management / SNQ / Lateral Entry', 'Quota category', 'Enter "Lateral Entry" or "KEA"']
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 35 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(book, instructionsSheet, 'Instructions_Guide');

    XLSX.writeFile(book, 'student-admissions-template-puc-and-lateral.xlsx');
    toast.success('Downloaded comprehensive admission template (PUC + Lateral Entry sheets)!');
  };

  const readImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const grid = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false });
      const key = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const aliases = {
        studentid: ['studentid', 'usn', 'universityseatnumber', 'usno', 'universitynumber'],
        admissionnumber: ['admissionnumber', 'admissionno', 'admno', 'admissionid'],
        studentname: ['studentname', 'studentfullname', 'fullname', 'name', 'candidatename'],
        cetnumber: ['cetnumber', 'cetno', 'cetapplicationnumber', 'kecetnumber', 'cetapplicationno', 'dcetnumber', 'dcetno'],
        cetrank: ['cetrank', 'rank', 'kecetrank', 'cetmeritrank', 'dcetrank'],
        dob: ['dob', 'dateofbirth', 'birthdate'],
        aadhaarnumber: ['aadhaarnumber', 'aadhaar', 'aadharnumber', 'uidnumber', 'aadhaarno'],
        studentcontact: ['studentcontact', 'studentphone', 'studentmobilenumber', 'mobile', 'mobilenumber', 'phone', 'contactnumber'],
        email: ['email', 'emailid', 'studentemail', 'emailaddress'],
        permanentaddress: ['permanentaddress', 'address', 'studentaddress', 'residentialaddress'],
        correspondenceaddress: ['correspondenceaddress', 'presentaddress'],
        fathername: ['fathername', 'fatherfullname', 'fathersname', 'father'],
        mothername: ['mothername', 'motherfullname', 'mothersname', 'mother'],
        parentcontact: ['parentcontact', 'parentphone', 'parentmobilenumber', 'guardiancontact', 'fathercontact'],
        annualincome: ['annualincome', 'familyincome', 'parentannualincome'],
        branch: ['branch', 'department', 'course', 'program'],
        year: ['year', 'studyyear', 'currentstudyyear'],
        admissionbatch: ['admissionbatch', 'batch', 'batchyear', 'joiningyear'],
        bloodgroup: ['bloodgroup', 'bloodgrp'],
        category: ['category', 'studentcategory', 'caste', 'castecategory'],
        allottedcategory: ['allottedcategory', 'admissioncategory'],
        section: ['section'],
        gender: ['gender', 'sex'],
        religion: ['religion'],
        subcaste: ['subcaste', 'caste'],
        fatheroccupation: ['fatheroccupation', 'fatherprofession'],
        motheroccupation: ['motheroccupation', 'motherprofession'],
        qualifyingexam: ['qualifyingexam', 'qualifyingexamination', 'exam'],
        board: ['board', 'boardname', 'diplomaboard'],
        state: ['state', 'diplomastate'],
        region: ['region', 'ruralurban'],
        feecollected: ['feecollected', 'amountpaid', 'feespaid'],
        diplomamarks: ['diplomamarks', 'diplomatotalmarks', 'diplomapercentage'],
        lateralentry: ['lateralentry', 'entrytype', 'islateral'],
        admissionquota: ['admissionquota', 'quota'],
        admissiontype: ['admissiontype', 'entrytype']
      };
      const headerIndex = grid.slice(0, 15).findIndex((line) => {
        const headers = line.map(key);
        return (aliases.studentname.some((name) => headers.includes(name)) || aliases.studentid.some((name) => headers.includes(name))) && headers.some((name) => aliases.admissionnumber.includes(name) || aliases.cetnumber.includes(name));
      });
      if (headerIndex < 0) throw new Error('Could not find the column headings. Use the downloadable template or include Student ID/USN, Student Name, and Admission Number headings.');
      const headers = grid[headerIndex].map(key);
      const displayHeaders = grid[headerIndex].map((value, index) => String(value || `Column ${index + 1}`));
      const nameColumn = headers.findIndex((header) => aliases.studentname.includes(header));
      const identifierColumns = headers.map((header, index) => aliases.studentid.includes(header) || aliases.cetnumber.includes(header) ? index : -1).filter((index) => index >= 0);
      const sourceRows = grid.slice(headerIndex + 1).filter((line) => {
        const hasName = nameColumn >= 0 && String(line[nameColumn] ?? '').trim() !== '';
        const hasStudentId = identifierColumns.some((index) => String(line[index] ?? '').trim() !== '');
        return hasName && hasStudentId;
      });
      const mapped = sourceRows.map((values) => {
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
        const num = (value) => String(value ?? '').trim() === '' ? undefined : Number(value);
        const get = (name, ...extra) => {
          const candidates = aliases[name] || [key(name)];
          for (const candidate of [...candidates, ...extra.map(key)]) if (row[candidate] !== undefined && String(row[candidate]).trim() !== '') return row[candidate];
          return '';
        };
        const permanentAddress = get('permanentaddress');
        return {
          studentId: String(get('studentid') || get('cetnumber')).trim(), admissionNumber: String(get('admissionnumber') || (get('cetnumber') ? `IMPORT-${String(get('cetnumber')).trim()}` : '')).trim(),
          personalDetails: { studentName: String(get('studentname')).trim(), cetNumber: String(get('cetnumber')).trim(), cetRank: num(get('cetrank')), dob: get('dob'), gender: get('gender'), bloodGroup: get('bloodgroup'), religion: get('religion'), category: get('category'), subCaste: get('subcaste'), aadhaarNumber: String(get('aadhaarnumber')).trim(), physicallyChallenged: get('physicallyChallenged') },
          familyDetails: { fatherName: get('fathername'), motherName: get('mothername'), parentContact: String(get('parentcontact', 'studentcontact')).trim(), fatherOccupation: get('fatheroccupation'), motherOccupation: get('motheroccupation'), annualIncome: String(get('annualincome')).trim() === '' ? NaN : Number(get('annualincome')) },
          academicDetails: { qualifyingExam: get('qualifyingexam'), board: get('board'), state: get('state'), region: get('region'), allottedCategory: get('allottedcategory') || get('category'), branch: get('branch'), year: num(get('year')), feeCollected: num(get('feecollected')), feeCollectedIdp: num(get('feecollectedidp')), feeCollectedVtu: num(get('feecollectedvtu')), feeCollectedPd: num(get('feecollectedpd')), percentage: num(get('percentage')), diplomaMarks: num(get('diplomamarks')), lateralEntry: get('lateralentry') },
          contactDetails: { studentContact: String(get('studentcontact')).trim(), email: String(get('email')).trim(), permanentAddress, correspondenceAddress: get('correspondenceaddress') || permanentAddress, sameAsPermanent: String(get('sameaspermanent')).toLowerCase() === 'true' || !get('correspondenceaddress'), defenceQuota: get('defencequota'), sportsQuota: get('sportsquota'), snqQuota: get('snqquota') },
          documents: { aadhaar: get('aadhaardocument'), marksCard: get('markscard'), photo: get('photo') }, admissionBatch: Number(get('admissionbatch')) || new Date().getFullYear(), admissionType: get('admissiontype') || (String(get('lateralentry')).toLowerCase() === 'yes' ? 'Lateral Entry' : 'Regular'), admissionQuota: get('admissionquota'), section: get('section'), semester: Number(get('semester')) || 1
        };
      });
      if (!mapped.length) throw new Error('The first sheet has no student rows.');
      setImportSheet({ headers: displayHeaders, rows: sourceRows });
      setImportRows(mapped);
      setShowImportModal(true);
    } catch (error) { toast.error(error.message || 'Could not read this Excel file'); }
  };
  const importStudents = async () => {
    setImporting(true);
    let added = 0;
    let updated = 0;
    const failures = [];
    const failedRows = [];
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const keepProvidedFields = (section = {}) => Object.fromEntries(Object.entries(section).filter(([, value]) => value !== '' && value !== null && value !== undefined && !(typeof value === 'number' && Number.isNaN(value))));
    for (let index = 0; index < importRows.length; index += 1) {
      const row = importRows[index];
      try {
        await axios.post('/api/office/students', row, { headers });
        added += 1;
      } catch (error) {
        const reason = error.response?.data?.error || 'registration failed';
        let existing = null;
        if (/already exists|already in use/i.test(reason)) {
          const searchValue = row.personalDetails.cetNumber || row.studentId;
          if (searchValue) {
            try {
              const response = await axios.get('/api/office/students', { headers, params: { search: searchValue } });
              existing = response.data.find((student) => String(student.studentId || '').toLowerCase() === String(row.studentId).toLowerCase() || String(student.personalDetails?.cetNumber || '').toLowerCase() === String(row.personalDetails.cetNumber).toLowerCase());
            } catch { /* Keep the duplicate as a reported failure when it cannot be matched. */ }
          }
        }
        if (existing?._id) {
          try {
            const changes = {
              personalDetails: keepProvidedFields(row.personalDetails),
              familyDetails: keepProvidedFields(row.familyDetails),
              academicDetails: keepProvidedFields(row.academicDetails),
              contactDetails: keepProvidedFields(row.contactDetails),
              documents: keepProvidedFields(row.documents)
            };
            await axios.put(`/api/office/students/${existing._id}`, changes, { headers });
            updated += 1;
            continue;
          } catch (updateError) {
            failures.push(`Row ${index + 2}: ${updateError.response?.data?.error || 'could not update the existing student'}`);
            failedRows.push(row);
            continue;
          }
        }
        failures.push(`Row ${index + 2}: ${reason}`);
        failedRows.push(row);
      }
    }
    setImporting(false);
    if (added || updated) { toast.success(`${added} new student${added === 1 ? '' : 's'} imported; ${updated} existing student${updated === 1 ? '' : 's'} updated`); fetchStudents(); }
    if (failures.length) {
      setImportRows(failedRows);
      toast.error(`${failures.length} row${failures.length === 1 ? '' : 's'} failed. ${failures[0]}`, { duration: 6000 });
    } else { setShowImportModal(false); setImportRows([]); }
  };

  const handleEditOpen = (student) => {
    // Populate form
    setFormData({
      studentId: student.studentId || '',
      admissionNumber: student.admissionNumber || '',
      personalDetails: { ...student.personalDetails, dob: student.personalDetails.dob ? student.personalDetails.dob.split('T')[0] : '' },
      familyDetails: student.familyDetails,
      academicDetails: student.academicDetails,
      contactDetails: student.contactDetails,
      documents: student.documents || { aadhaar: '', marksCard: '', photo: '' }
    });
    setEditStudent(student);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/office/students/${editStudent._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Student profile updated successfully!');
      setEditStudent(null);
      setFormData(emptyForm);
      fetchStudents();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/office/students/${showDeleteConfirm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Student profile deleted successfully');
      setShowDeleteConfirm(null);
      fetchStudents();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-md">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 flex items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search Student ID, name, or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-sm font-semibold transition-colors">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-200"
          >
            <option value="All">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-200"
          >
            <option value="All">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className="px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-200">
            <option value="All">All Batches</option>
            {[2026, 2025, 2024, 2023].map((year) => <option key={year} value={year}>{year}-{String(year + 4).slice(-2)}</option>)}
          </select>

          <select
            value={filterFee}
            onChange={(e) => setFilterFee(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-200"
          >
            <option value="All">All Fee Status</option>
            <option value="Paid">Fully Paid</option>
            <option value="Pending">Pending Due</option>
          </select>

          <button
            onClick={() => { setFormData(emptyForm); setShowAddModal(true); }}
            className="ml-auto md:ml-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-500/15 transition-all duration-200"
          >
            <Plus size={15} /> Add Student
          </button>
          <button type="button" onClick={downloadImportTemplate} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold">
            <FileText size={15} /> Template
          </button>
          <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold cursor-pointer">
            <Upload size={15} /> Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={readImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Student Directory Table */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin"></div>
            <p className="text-xs">Loading Student Directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-semibold">No students matching the criteria found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-950/40 text-[10px] uppercase font-bold text-slate-450 tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="p-4 pl-6">Student Info</th>
                  <th className="p-4">Student ID / Admission No</th>
                  <th className="p-4">Branch & Year</th>
                  <th className="p-4">Fee Status</th>
                  <th className="p-4">Biometric Dataset</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-350 font-bold overflow-hidden border border-slate-700/50">
                          {student.documents?.photo ? (
                            <img src={student.documents.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            student.personalDetails.studentName.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block text-xs md:text-sm">{student.personalDetails.studentName}</span>
                          <span className="text-[10px] text-slate-400">{student.contactDetails.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-300">
                      <div>{student.studentId || `CET: ${student.personalDetails.cetNumber}`}</div>
                      <div className="text-[10px] text-blue-400 mt-0.5">{student.admissionNumber || 'Awaiting Approval'}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-300">
                      <div className="font-medium">{student.academicDetails.branch}</div>
                      <div className="text-slate-405 text-[10px]">Batch {student.admissionBatch ? `${student.admissionBatch}-${String(student.admissionBatch + 4).slice(-2)}` : 'Pending'} · Year {getStudentStudyYear(student)}</div>
                    </td>
                    <td className="p-4">
                      {student.feeStatus?.currentYear === 'Completed' ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg">Paid</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-550 border border-amber-500/20 text-[10px] font-bold rounded-lg">Due</span>
                      )}
                    </td>
                    <td className="p-4">
                      {student.faceRegistered ? (
                        <span className="px-2.5 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-full">Registered</span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-semibold rounded-full">Unregistered</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right space-x-1.5">
                      <button onClick={() => setViewStudent(student)} title="View Complete Profile" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors inline-block">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleEditOpen(student)} title="Edit Profile" className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-colors inline-block border border-blue-500/20">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => viewCredentials(student)} title="View student login credentials" className="p-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 transition-colors inline-block border border-violet-500/20"><KeyRound size={14} /></button>
                      <button onClick={() => navigate('/dashboard/office/facerec', { state: { studentId: student._id } })} title="Register or verify face" disabled={!student.studentId} className="p-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 transition-colors inline-block border border-emerald-500/20 disabled:opacity-30"><ScanFace size={14} /></button>
                      <button onClick={() => setShowDeleteConfirm(student._id)} title="Remove Student" className="p-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 transition-colors inline-block border border-rose-500/20">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && students.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/30 border border-slate-800/80 rounded-2xl px-4 py-3">
          <p className="text-[11px] text-slate-400">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, students.length)} of {students.length} student records
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-950/40 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-xs font-bold text-blue-400">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-950/40 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-400">Student login credentials</p><h3 className="mt-1 text-lg font-bold text-white">{credentials.studentName}</h3></div><button onClick={() => setCredentials(null)} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
            <div className="mt-5 space-y-3 rounded-xl bg-black/20 p-4 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-400">Username</span><code className="font-bold text-white">{credentials.username || 'Not generated yet'}</code></div><div className="flex justify-between gap-4"><span className="text-slate-400">Initial password</span><code className="font-bold text-white">{credentials.password || 'Already changed by student'}</code></div></div>
            <p className="mt-3 text-xs text-slate-400">Share this securely. The student is prompted to change the initial password.</p>
            <div className="mt-5 flex justify-end gap-2"><button onClick={printCredentials} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Print</button><button onClick={() => setCredentials(null)} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">Done</button></div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {(showAddModal || editStudent) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-slate-800 p-6 rounded-2.5xl max-w-4xl w-full shadow-2xl animate-fade-in my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {showAddModal ? 'Manually Register Student Profile' : 'Modify Student Profile'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditStudent(null); setFormData(emptyForm); }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-6">

              {/* Section 1: Personal Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">1. Personal Credentials</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.personalDetails.studentName}
                      onChange={(e) => handleInputChange('personalDetails', 'studentName', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">CET Number / Unique ID *</label>
                    <input
                      type="text"
                      required
                      disabled={!showAddModal}
                      value={formData.personalDetails.cetNumber}
                      maxLength={5}
                      pattern="[A-Za-z]{2}[0-9]{3}"
                      onChange={(e) => handleInputChange('personalDetails', 'cetNumber', sanitizeCETNumber(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">USN / Student ID</label>
                    <input
                      type="text"
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value.toUpperCase() }))}
                      placeholder="e.g. 2026CS001"
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Admission Number *</label>
                    <input
                      type="text"
                      required
                      disabled={!showAddModal}
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, admissionNumber: e.target.value.toUpperCase() }))}
                      placeholder="e.g. ADM202600001"
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Aadhaar Card Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.personalDetails.aadhaarNumber}
                      onChange={(e) => handleInputChange('personalDetails', 'aadhaarNumber', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">CET Rank *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000000"
                      value={formData.personalDetails.cetRank}
                      onChange={(e) => handleInputChange('personalDetails', 'cetRank', sanitizeCETRank(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={formData.personalDetails.dob}
                      onChange={(e) => handleInputChange('personalDetails', 'dob', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Gender *</label>
                    <select
                      value={formData.personalDetails.gender}
                      onChange={(e) => handleInputChange('personalDetails', 'gender', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Blood Group *</label>
                    <input
                      type="text"
                      required
                      value={formData.personalDetails.bloodGroup}
                      onChange={(e) => handleInputChange('personalDetails', 'bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Religion *</label>
                    <input
                      type="text"
                      required
                      value={formData.personalDetails.religion}
                      onChange={(e) => handleInputChange('personalDetails', 'religion', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Category Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.personalDetails.category}
                      onChange={(e) => handleInputChange('personalDetails', 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Family Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">2. Family Profile</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Father's Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.familyDetails.fatherName}
                      onChange={(e) => handleInputChange('familyDetails', 'fatherName', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Mother's Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.familyDetails.motherName}
                      onChange={(e) => handleInputChange('familyDetails', 'motherName', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Parent Contact No *</label>
                    <input
                      type="text"
                      required
                      value={formData.familyDetails.parentContact}
                      onChange={(e) => handleInputChange('familyDetails', 'parentContact', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Annual Family Income (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.familyDetails.annualIncome}
                      onChange={(e) => handleInputChange('familyDetails', 'annualIncome', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Father's Occupation</label>
                    <input
                      type="text"
                      value={formData.familyDetails.fatherOccupation}
                      onChange={(e) => handleInputChange('familyDetails', 'fatherOccupation', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Mother's Occupation</label>
                    <input
                      type="text"
                      value={formData.familyDetails.motherOccupation}
                      onChange={(e) => handleInputChange('familyDetails', 'motherOccupation', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Academic Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">3. Academic & Allocation</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Allotted Department *</label>
                    <select
                      value={formData.academicDetails.branch}
                      onChange={(e) => handleInputChange('academicDetails', 'branch', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    >
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Initial Fee Paid (₹) *</label>
                    <input
                      type="number"
                      required
                      disabled={!showAddModal}
                      value={formData.academicDetails.feeCollected}
                      onChange={(e) => handleInputChange('academicDetails', 'feeCollected', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Qualifying Examination</label>
                    <input
                      type="text"
                      value={formData.academicDetails.qualifyingExam}
                      onChange={(e) => handleInputChange('academicDetails', 'qualifyingExam', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Contact & Addresses */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">4. Contact & Address Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Student Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactDetails.studentContact}
                      onChange={(e) => handleInputChange('contactDetails', 'studentContact', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Primary Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.contactDetails.email}
                      onChange={(e) => handleInputChange('contactDetails', 'email', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-semibold text-slate-450 block mb-1">Permanent Residence Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={formData.contactDetails.permanentAddress}
                      onChange={(e) => handleInputChange('contactDetails', 'permanentAddress', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Document Uploads */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">5. Attach Verification Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Photo upload */}
                  <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-between text-center min-h-[140px]">
                    <span className="text-[10px] font-bold text-slate-400 block mb-2">Student Photograph</span>
                    {formData.documents.photo ? (
                      <div className="relative h-16 w-16 mb-2">
                        <img src={formData.documents.photo} alt="Photo" className="h-full w-full object-cover rounded-lg border" />
                        <button type="button" onClick={() => handleInputChange('documents', 'photo', '')} className="absolute -top-1 -right-1 p-0.5 bg-rose-600 rounded-full text-white"><X size={10} /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer p-3 bg-slate-900 hover:bg-slate-850 rounded-xl inline-flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
                        <Upload size={16} />
                        <span className="text-[9px]">Select Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Aadhaar upload */}
                  <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-between text-center min-h-[140px]">
                    <span className="text-[10px] font-bold text-slate-400 block mb-2">Aadhaar Card (PDF/Image)</span>
                    {formData.documents.aadhaar ? (
                      <div className="mb-2 text-xs flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg">
                        <FileText size={14} className="text-blue-400" />
                        <span className="text-[10px] text-slate-300">Aadhaar Uploaded</span>
                        <button type="button" onClick={() => handleInputChange('documents', 'aadhaar', '')} className="p-0.5 bg-rose-600 rounded-full text-white"><X size={10} /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer p-3 bg-slate-900 hover:bg-slate-850 rounded-xl inline-flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
                        <Upload size={16} />
                        <span className="text-[9px]">Select Document</span>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'aadhaar')} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Marks card upload */}
                  <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-between text-center min-h-[140px]">
                    <span className="text-[10px] font-bold text-slate-400 block mb-2">Qualifying Marks Card</span>
                    {formData.documents.marksCard ? (
                      <div className="mb-2 text-xs flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg">
                        <FileText size={14} className="text-blue-400" />
                        <span className="text-[10px] text-slate-300">Marks Card Uploaded</span>
                        <button type="button" onClick={() => handleInputChange('documents', 'marksCard', '')} className="p-0.5 bg-rose-600 rounded-full text-white"><X size={10} /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer p-3 bg-slate-900 hover:bg-slate-850 rounded-xl inline-flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
                        <Upload size={16} />
                        <span className="text-[9px]">Select Marks Card</span>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'marksCard')} className="hidden" />
                      </label>
                    )}
                  </div>

                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditStudent(null); setFormData(emptyForm); }}
                  className="flex-1 py-2.5 bg-slate-905 hover:bg-slate-800 text-slate-350 border border-slate-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-550 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {showAddModal ? 'Save & Register Profile' : 'Save Profile Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-700 pb-4">
              <div><h3 className="text-lg font-bold text-white">Import students from spreadsheet</h3><p className="mt-1 text-xs text-slate-400">Review the student rows from your selected Excel sheet.</p></div>
              <button type="button" disabled={importing} onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white disabled:opacity-40"><X size={20} /></button>
            </div>
            <div className="mt-4 max-h-[45vh] overflow-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-xs"><thead className="sticky top-0 bg-slate-950 text-slate-400"><tr>{importSheet.headers.map((header, index) => <th key={`${header}-${index}`} className="whitespace-nowrap p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{importSheet.rows.map((values, rowIndex) => <tr key={rowIndex} className="text-slate-200">{importSheet.headers.map((header, colIndex) => <td key={`${rowIndex}-${header}-${colIndex}`} className="max-w-64 whitespace-nowrap p-3">{String(values[colIndex] ?? '')}</td>)}</tr>)}</tbody></table>
            </div>
            <p className="mt-3 text-xs text-slate-400">This shows the rows from your selected Excel sheet. Student details that match the available columns will be included during import. The server may still reject a record if it lacks information required to create a student profile.</p>
            <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={importing} onClick={() => setShowImportModal(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Cancel</button><button type="button" disabled={importing} onClick={importStudents} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{importing ? 'Importing all students…' : 'Import all students'}</button></div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Student Profile?</h3>
            <p className="text-slate-400 text-xs mb-6">Are you sure you want to delete this student record? All related fees history and face biometric profiles will be permanently lost.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Student Profile View Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-slate-800 p-6 rounded-2.5xl max-w-3xl w-full shadow-2xl animate-fade-in my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Detailed Student Profile</h3>
                <p className="text-[10px] text-slate-400">CET: {viewStudent.personalDetails.cetNumber} | Admission: {viewStudent.admissionNumber || 'Awaiting Approval'}</p>
              </div>
              <button
                onClick={() => setViewStudent(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">

              {/* Header profile row */}
              <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-950/30 p-5 rounded-2xl border border-slate-800/80">
                <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center text-3xl font-extrabold text-slate-300">
                  {viewStudent.documents?.photo ? (
                    <img src={viewStudent.documents.photo} alt="Photo" className="h-full w-full object-cover" />
                  ) : (
                    <User size={36} className="text-slate-500" />
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="text-xl font-bold text-slate-100">{viewStudent.personalDetails.studentName}</h4>
                  <p className="text-xs text-blue-400 font-semibold">{viewStudent.academicDetails.branch} Department</p>
                  <p className="text-xs text-slate-400 mt-1">Year {viewStudent.academicDetails.year} | Sem {viewStudent.semester} | Section {viewStudent.section}</p>
                </div>

                <div className="sm:ml-auto flex flex-col gap-2">
                  <div className="px-3 py-1 bg-slate-850 rounded-xl text-center border border-slate-800">
                    <span className="text-[9px] text-slate-450 block">CET Rank</span>
                    <span className="text-sm font-bold text-slate-200"># {viewStudent.personalDetails.cetRank}</span>
                  </div>
                </div>
              </div>

              {/* Grid sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. Personal & Contact */}
                <div className="bg-slate-950/20 p-5 rounded-2xl border border-slate-800/50 space-y-3">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1.5">Personal & Contact</h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Date of Birth</span>
                      <span className="text-slate-300 font-medium">{new Date(viewStudent.personalDetails.dob).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Gender / Blood</span>
                      <span className="text-slate-300 font-medium">{viewStudent.personalDetails.gender} ({viewStudent.personalDetails.bloodGroup})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Aadhaar Number</span>
                      <span className="text-slate-300 font-medium">{viewStudent.personalDetails.aadhaarNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Category / Caste</span>
                      <span className="text-slate-300 font-medium">{viewStudent.personalDetails.category}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Email Address</span>
                      <span className="text-slate-300 font-medium">{viewStudent.contactDetails.email}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Phone Contact</span>
                      <span className="text-slate-300 font-medium">{viewStudent.contactDetails.studentContact}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Permanent Residence</span>
                      <span className="text-slate-300 font-medium leading-relaxed block mt-0.5">{viewStudent.contactDetails.permanentAddress}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Family & Financials */}
                <div className="bg-slate-950/20 p-5 rounded-2xl border border-slate-800/50 space-y-3">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1.5">Family & Financials</h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Father Name</span>
                      <span className="text-slate-300 font-medium">{viewStudent.familyDetails.fatherName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Mother Name</span>
                      <span className="text-slate-300 font-medium">{viewStudent.familyDetails.motherName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Father Occupation</span>
                      <span className="text-slate-300 font-medium">{viewStudent.familyDetails.fatherOccupation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Annual Income</span>
                      <span className="text-slate-300 font-medium">₹ {viewStudent.familyDetails.annualIncome?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Emergency Parent Contact</span>
                      <span className="text-slate-300 font-medium">{viewStudent.familyDetails.parentContact}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Fee Ledgers */}
                <div className="bg-slate-950/20 p-5 rounded-2xl border border-slate-800/50 space-y-3 md:col-span-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1.5 flex justify-between">
                    <span>Fee collection log</span>
                    <span className="text-slate-300">Total Fee: ₹ {viewStudent.feeDetails?.totalFee || 85000}</span>
                  </h5>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs pb-3 border-b border-slate-800/60">
                    <div className="p-2.5 bg-slate-900 rounded-xl">
                      <span className="text-[9px] text-slate-500 block">Total Due</span>
                      <span className="text-sm font-bold text-amber-500">₹ {(viewStudent.feeDetails?.pendingFee ?? 85000).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl">
                      <span className="text-[9px] text-slate-500 block">Total Paid</span>
                      <span className="text-sm font-bold text-emerald-400">₹ {(viewStudent.feeDetails?.paidFee ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl">
                      <span className="text-[9px] text-slate-500 block">Payments Status</span>
                      <span className={`text-xs font-bold block mt-0.5 ${viewStudent.feeStatus?.currentYear === 'Completed' ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {viewStudent.feeStatus?.currentYear === 'Completed' ? 'FULLY PAID' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Fee log history */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <span className="text-[10px] text-slate-400 font-bold block">Transactions History</span>
                    {!viewStudent.feeHistory || viewStudent.feeHistory.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">No payment transactions recorded yet.</p>
                    ) : (
                      viewStudent.feeHistory.map((hist, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-slate-300 font-semibold">Collected: ₹ {hist.amount} ({hist.paymentMode})</span>
                            <span className="text-slate-500 block">Receipt: {hist.receiptNumber} | TxID: {hist.transactionId}</span>
                          </div>
                          <span className="text-slate-450">{new Date(hist.date).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Uploaded Verification Documents */}
                <div className="bg-slate-950/20 p-5 rounded-2xl border border-slate-800/50 space-y-3 md:col-span-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1.5">Verification Documents</h5>
                  <div className="grid grid-cols-2 gap-4">

                    <div>
                      <span className="text-[10px] text-slate-450 block mb-1">Aadhaar Card Attachment</span>
                      {viewStudent.documents?.aadhaar ? (
                        <a
                          href={viewStudent.documents.aadhaar}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs text-blue-400 font-semibold transition-colors"
                        >
                          <FileText size={15} /> Open Aadhaar Card Document
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No Aadhaar document uploaded</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-450 block mb-1">PUC / qualifying Marks Card</span>
                      {viewStudent.documents?.marksCard ? (
                        <a
                          href={viewStudent.documents.marksCard}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs text-blue-400 font-semibold transition-colors"
                        >
                          <FileText size={15} /> Open Marks Card Document
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No Marks Card document uploaded</span>
                      )}
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
