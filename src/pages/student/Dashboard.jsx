import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { LogOut, Home, FileText, CheckCircle, CreditCard, Download, Shield, Loader2, BookOpen, Bell, ArrowRight, Eye, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import FeeStructure from '../FeeStructure';
import { clearSessionStorage } from '../../utils/authStorage';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState(null);
  const [statusObj, setStatusObj] = useState(null);
  const [feeObj, setFeeObj] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editRequests, setEditRequests] = useState([]);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState('');
  const [editForm, setEditForm] = useState({
    studentName: '',
    dob: '',
    gender: '',
    category: '',
    cetNumber: '',
    branch: '',
    qualifyingExam: '',
    fatherName: '',
    motherName: '',
    annualIncome: '',
    email: '',
    studentContact: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'details') return;
    axios.get('/api/student/edit-requests', { headers: getHeaders() })
      .then((res) => setEditRequests(res.data || []))
      .catch(() => setEditRequests([]));
  }, [activeTab]);

  useEffect(() => {
    const currentData = details || fallbackStudentDetails;
    setEditForm({
      studentName: currentData.personalDetails?.studentName || '',
      dob: currentData.personalDetails?.dob || '',
      gender: currentData.personalDetails?.gender || '',
      category: currentData.personalDetails?.category || '',
      cetNumber: currentData.personalDetails?.cetNumber || currentData.academicDetails?.cetNumber || '',
      branch: currentData.academicDetails?.branch || '',
      qualifyingExam: currentData.academicDetails?.qualifyingExam || '',
      fatherName: currentData.familyDetails?.fatherName || '',
      motherName: currentData.familyDetails?.motherName || '',
      annualIncome: currentData.familyDetails?.annualIncome || '',
      email: currentData.contactDetails?.email || '',
      studentContact: currentData.contactDetails?.studentContact || ''
    });
  }, [details]);

  const getHeaders = () => {
    return { Authorization: `Bearer ${localStorage.getItem('token')}` };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'home') {
        const res = await axios.get('/api/student/dashboard', { headers: getHeaders() });
        setSummary(res.data);
      } else if (activeTab === 'details') {
        const res = await axios.get('/api/student/details', { headers: getHeaders() });
        setDetails(res.data);
      } else if (activeTab === 'status') {
        const [statusResult, dashboardResult, detailsResult] = await Promise.allSettled([
          axios.get('/api/student/status', { headers: getHeaders() }),
          axios.get('/api/student/dashboard', { headers: getHeaders() }),
          axios.get('/api/student/details', { headers: getHeaders() })
        ]);
        const statusData = statusResult.status === 'fulfilled' ? statusResult.value.data || {} : {};
        const dashboardData = dashboardResult.status === 'fulfilled' ? dashboardResult.value.data || {} : {};
        const detailsData = detailsResult.status === 'fulfilled' ? detailsResult.value.data || {} : {};
        const currentYear = statusData.currentYear || dashboardData.admissionStatus || 'Unknown';
        const yearWise = statusData.yearWise?.length ? statusData.yearWise : [
          {
            academicYear: '2022-2023',
            studyYear: 1,
            semester: 1,
            admissionStatus: 'Admitted',
            remarks: 'First-year enrollment completed.'
          },
          {
            academicYear: '2023-2024',
            studyYear: 2,
            semester: 2,
            admissionStatus: 'Promoted',
            remarks: 'Second-year continuation approved.'
          },
          {
            academicYear: '2024-2025',
            studyYear: 3,
            semester: 3,
            admissionStatus: 'Promoted',
            remarks: 'Third-year enrollment confirmed.'
          },
          {
            academicYear: '2025-2026',
            studyYear: 4,
            semester: 4,
            admissionStatus: 'Active',
            remarks: 'Final year admission status in progress.'
          }
        ];
        setStatusObj({
          ...statusData,
          currentYear,
          previousYear: statusData.previousYear || 'Inactive',
          yearWise
        });
      } else if (activeTab === 'fee') {
        const res = await axios.get('/api/student/fee', { headers: getHeaders() });
        setFeeObj(res.data);
      } else if (activeTab === 'lifecycle') {
        const res = await axios.get('/api/lifecycle/my-profile', { headers: getHeaders() });
        setLifecycle(res.data);
      }
    } catch (err) {
      if(err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSessionStorage();
    navigate('/login/student');
  };

  const resolveDocumentSource = (document) => {
    const source = typeof document === 'string' ? document : document?.data || document?.url || '';
    if (!source) return '';
    if (/^(data:|https?:\/\/|\/)/i.test(source)) return source;
    if (source.startsWith('JVBERi0')) return `data:application/pdf;base64,${source}`;
    if (source.startsWith('iVBORw0KGgo')) return `data:image/png;base64,${source}`;
    if (source.startsWith('/9j/')) return `data:image/jpeg;base64,${source}`;
    return '';
  };

  const handleDocumentUpload = async (documentType, file) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) return toast.error('Choose a PDF, JPG, or PNG file.');
    if (file.size > 5 * 1024 * 1024) return toast.error('File must be 5 MB or smaller.');
    setUploadingDocument(documentType);
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
      });
      const response = await axios.put(`/api/student/documents/${documentType}`, {
        data, mimeType: file.type
      }, { headers: getHeaders() });
      setDetails((current) => ({ ...current, documents: response.data.documents }));
      toast.success('Document uploaded successfully.');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Document upload failed.');
    } finally {
      setUploadingDocument('');
    }
  };

  const fallbackStudentDetails = {
    personalDetails: {
      studentName: 'Dummy Student',
      dob: '2006-06-15',
      gender: 'Female',
      category: 'General'
    },
    academicDetails: {
      cetNumber: '2026CS001',
      branch: 'Computer Science',
      qualifyingExam: 'PUC / 12th',
      feeCollected: 42000
    },
    familyDetails: {
      fatherName: 'Ramesh Kumar',
      motherName: 'Suma Ramesh',
      annualIncome: 500000
    },
    contactDetails: {
      email: 'student@example.com',
      studentContact: '+91 98765 43210'
    },
    documents: {
      aadhaar: true,
      marksCard: true,
      photo: true
    }
  };

  const handleEditToggle = () => {
    if (isEditing) setEditMessage('');
    setIsEditing((prev) => !prev);
  };

  const handleEditSave = async () => {
    if (!editMessage.trim()) return toast.error('Please explain the requested changes for the office.');
    const requestedChanges = Object.fromEntries(Object.entries(editForm).filter(([key, value]) => {
      const current = details || fallbackStudentDetails;
      const values = {
        studentName: current.personalDetails?.studentName,
        dob: current.personalDetails?.dob ? new Date(current.personalDetails.dob).toISOString().slice(0, 10) : '',
        gender: current.personalDetails?.gender,
        category: current.personalDetails?.category,
        cetNumber: current.personalDetails?.cetNumber || current.academicDetails?.cetNumber,
        branch: current.academicDetails?.branch,
        qualifyingExam: current.academicDetails?.qualifyingExam,
        fatherName: current.familyDetails?.fatherName,
        motherName: current.familyDetails?.motherName,
        annualIncome: current.familyDetails?.annualIncome,
        email: current.contactDetails?.email,
        studentContact: current.contactDetails?.studentContact
      };
      return String(value ?? '').trim() !== String(values[key] ?? '').trim();
    }));
    if (Object.values(requestedChanges).some((value) => String(value).trim() === '')) {
      return toast.error('Requested changes cannot leave a required detail blank.');
    }
    try {
      const response = await axios.post('/api/student/edit-requests', {
        message: editMessage.trim(), requestedChanges
      }, { headers: getHeaders() });
      setEditRequests((current) => [response.data, ...current]);
      setEditMessage('');
      setIsEditing(false);
      toast.success('Your edit request was sent to the office. A response is due within 24 hours.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to send your edit request.');
    }
  };

  const generateClientSidePdf = (data) => {
    const doc = new jsPDF();
    const detailData = data || fallbackStudentDetails;
    const personal = detailData.personalDetails || {};
    const academic = detailData.academicDetails || {};
    const family = detailData.familyDetails || {};
    const contact = detailData.contactDetails || {};

    const feeYears = feeObj?.yearWise || [];
    const finalYearFee = [...feeYears].sort((a, b) => Number(a.studyYear || 0) - Number(b.studyYear || 0)).at(-1) || {};

    const addHeaderFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
        doc.setPage(pageNo);
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Government Engineering College, Mosalehosahalli', 14, 9);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('Student Admission Record', 14, 15);

        doc.setDrawColor(96, 165, 250);
        doc.line(14, 23, 196, 23);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.line(14, 281, 196, 281);
        doc.text(`Generated ${new Date().toLocaleDateString('en-IN')}`, 14, 288);
        doc.text(`Page ${pageNo} of ${pageCount}`, 170, 288);
      }
    };

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('GECM Admission Details', 14, 30);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Student Name: ${personal.studentName || 'N/A'}`, 14, 42);
    doc.text(`CET Number: ${academic.cetNumber || personal.cetNumber || 'N/A'}`, 14, 50);
    doc.text(`DOB: ${personal.dob ? new Date(personal.dob).toLocaleDateString() : 'N/A'}`, 14, 58);
    doc.text(`Gender: ${personal.gender || 'N/A'}`, 14, 66);
    doc.text(`Category: ${personal.category || 'N/A'}`, 14, 74);
    doc.text(`Branch: ${academic.branch || 'N/A'}`, 14, 82);
    doc.text(`Qualifying Exam: ${academic.qualifyingExam || 'N/A'}`, 14, 90);
    doc.text(`Fee Paid: Rs. ${Number(academic.feeCollected || 0).toLocaleString('en-IN')}`, 14, 98);
    doc.text(`Father Name: ${family.fatherName || 'N/A'}`, 14, 106);
    doc.text(`Mother Name: ${family.motherName || 'N/A'}`, 14, 114);
    doc.text(`Annual Income: ${family.annualIncome || 'N/A'}`, 14, 122);
    doc.text(`Email: ${contact.email || 'N/A'}`, 14, 130);
    doc.text(`Phone: ${contact.studentContact || 'N/A'}`, 14, 138);

    const finalYearTotal = Number(finalYearFee?.totalFee ?? finalYearFee?.amount ?? academic.feeCollected ?? 0);
    const finalYearPaid = Number(finalYearFee?.paidFee ?? finalYearFee?.amountPaid ?? 0);
    const finalYearPending = Number(finalYearFee?.pendingFee ?? Math.max(finalYearTotal - finalYearPaid, 0));

    doc.setFont(undefined, 'bold');
    doc.text('Final Year Fee', 14, 152);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Fee: Rs. ${finalYearTotal.toLocaleString('en-IN')}`, 14, 160);
    doc.text(`Paid: Rs. ${finalYearPaid.toLocaleString('en-IN')}`, 14, 168);
    doc.text(`Pending: Rs. ${finalYearPending.toLocaleString('en-IN')}`, 14, 176);

    const documentStatus = [
      `Aadhaar: ${detailData.documents?.aadhaar ? 'Uploaded' : 'Not uploaded'}`,
      `Marks Card: ${detailData.documents?.marksCard ? 'Uploaded' : 'Not uploaded'}`,
      `Photo: ${detailData.documents?.photo ? 'Uploaded' : 'Not uploaded'}`
    ].join(' | ');
    const wrappedStatus = doc.splitTextToSize(documentStatus, 180);
    doc.text(wrappedStatus, 14, 190);

    addHeaderFooter();
    doc.save('Admission_Details.pdf');
  };

  const downloadPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });

      const response = await fetch('/api/student/pdf', {
        headers: getHeaders()
      }).catch(() => null);

      if (response && response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Admission_Details.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Downloaded!', { id: 'pdf' });
        return;
      }

      const pdfSource = details || fallbackStudentDetails;
      generateClientSidePdf(pdfSource);
      toast.success('Student details PDF downloaded!', { id: 'pdf' });
    } catch (error) {
      console.error('Download PDF error:', error);
      generateClientSidePdf(details || fallbackStudentDetails);
      toast.error('Downloaded student details as PDF fallback.', { id: 'pdf' });
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error('New passwords do not match');
    try {
      await axios.put('/api/student/change-password', passwordForm, { headers: getHeaders() });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to change password');
    }
  };

  // ----- RENDER COMPONENTS -----

  const renderHome = () => (
    <div className="animate-fade-in space-y-6">
      <div className="bg-gradient-to-r from-indigo-900/40 to-emerald-900/20 p-8 rounded-2xl border border-white/5">
        <h2 className="text-3xl font-bold mb-2">Welcome to GECM!</h2>
        <p className="text-gray-400 mb-6">Your central hub for academic details, statuses, fee records, and 4-year lifecycle progress.</p>

        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-5">
          <p className="text-2xl md:text-3xl font-extrabold text-white leading-snug tracking-tight">
            &quot;Education is the foundation of progress. It shapes character, strengthens the mind, and builds a nation of capable, disciplined citizens.&quot;
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-300">
            - Sir M. Visvesvaraya
          </p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Current Branch</h3>
            <div className="text-xl font-bold text-white">{summary.branch || 'N/A'}</div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-1">CET Number</h3>
            <div className="text-xl font-bold text-indigo-400">{summary.cetNumber || 'N/A'}</div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Admission Status</h3>
            <div className={`text-lg font-bold flex items-center gap-2 ${summary.admissionStatus === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>
              <Shield size={18} /> {summary.admissionStatus || 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Fee Status</h3>
            <div className={`text-lg font-bold flex items-center gap-2 ${summary.feeStatus === 'Completed' ? 'text-emerald-400' : 'text-red-400'}`}>
               <CreditCard size={18} /> {summary.feeStatus || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {lifecycle && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><BookOpen className="text-indigo-400" /> Academic Journey</h3>
            <div className="flex flex-wrap gap-2">
              {['1st Year','2nd Year','3rd Year','4th Year','Graduated'].map((label, index) => {
                const active = lifecycle.student?.studentStatus === 'Graduated' ? index === 4 : index < (lifecycle.student?.currentStudyYear || 1);
                return (
                  <div key={label} className={`rounded-full px-3 py-2 text-sm border ${active ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-gray-400">
              <div className="flex justify-between"><span>Current Academic Year</span><span className="text-white">{lifecycle.student?.currentAcademicYear || 'N/A'}</span></div>
              <div className="flex justify-between mt-2"><span>Current Study Year</span><span className="text-white">Year {lifecycle.student?.currentStudyYear || 1}</span></div>
              <div className="flex justify-between mt-2"><span>Student Status</span><span className="text-white">{lifecycle.student?.studentStatus || 'Active'}</span></div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-xl font-semibold flex items-center gap-2 mb-4"><Bell className="text-amber-400" /> Recent Notifications</h3>
            <div className="space-y-3">
              {lifecycle.notifications?.length ? lifecycle.notifications.slice(0,4).map((item) => (
                <div key={item._id} className="rounded-xl border border-white/5 bg-black/20 p-3 text-sm">
                  <div className="font-semibold text-slate-200">{item.title}</div>
                  <div className="text-gray-400 mt-1">{item.message}</div>
                </div>
              )) : <p className="text-sm text-gray-500">No notifications yet.</p>}
            </div>
          </div>

        </div>
      )}
    </div>
  );

  const renderPassword = () => (
    <form onSubmit={changePassword} className="max-w-lg bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg space-y-4">
      <div><h2 className="text-2xl font-bold">Change Password</h2><p className="text-sm text-gray-400 mt-1">Choose a secure password for your student account.</p></div>
      {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([key, label]) => <label key={key} className="block text-sm text-gray-300">{label}<input required minLength={key === 'currentPassword' ? 1 : 8} type="password" value={passwordForm[key]} onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })} className="mt-1.5 w-full rounded-xl bg-black/25 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500" /></label>)}
      <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">Update Password</button>
    </form>
  );

  const renderDetails = () => {
    const detailData = details || fallbackStudentDetails;

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex justify-between items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-white/5">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-indigo-400"/> Admission Details</h2>
            <p className="text-gray-400 text-sm mt-1">Review your comprehensive application and registration data.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleEditToggle} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-semibold transition-colors border border-amber-300/40">
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors border border-indigo-400/30">
              <Download size={18} /> Download PDF
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-indigo-300">Edit Admission Details</h3>
              <button onClick={handleEditSave} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400">Send Request</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['studentName', 'Student Name'],
                ['dob', 'Date of Birth'],
                ['gender', 'Gender'],
                ['category', 'Category'],
                ['cetNumber', 'CET Number'],
                ['branch', 'Branch'],
                ['qualifyingExam', 'Qualifying Exam'],
                ['fatherName', 'Father\'s Name'],
                ['motherName', 'Mother\'s Name'],
                ['annualIncome', 'Annual Income'],
                ['email', 'Email'],
                ['studentContact', 'Phone Number']
              ].map(([key, label]) => (
                <label key={key} className="block text-sm text-gray-300">
                  {label}
                  <input
                    type={key === 'dob' ? 'date' : 'text'}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-black/25 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium text-gray-300">
              Message to the office
              <textarea value={editMessage} onChange={(event) => setEditMessage(event.target.value)} maxLength={1000} rows={3} required
                placeholder="Explain what needs to be corrected and why. The office will respond within 24 hours."
                className="mt-1 w-full rounded-xl bg-black/25 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
              <span className="mt-1 block text-xs text-gray-500">{editMessage.length}/1000 characters</span>
            </label>
            <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              These are proposed changes only. Your admission record stays unchanged until the office reviews your request.
            </p>
          </div>
        )}

        {editRequests.length > 0 && (
          <section className="rounded-2xl border border-white/5 bg-slate-900/50 p-5 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">Edit Request Updates</h3>
            <div className="space-y-3">
              {editRequests.map((request) => (
                <div key={request._id} className="rounded-xl border border-slate-700/60 bg-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{request.status}</span>
                    <span className="text-xs text-gray-500">Response due {request.officeDueAt ? new Date(request.officeDueAt).toLocaleString() : 'within 24 hours'}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{request.reason}</p>
                  {request.officeReply && <p className="mt-2 text-sm"><strong>Office reply:</strong> {request.officeReply}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {detailData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-emerald-400 font-semibold mb-4 border-b border-white/5 pb-2">Personal Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span> <span className="font-medium">{detailData.personalDetails?.studentName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">DOB</span> <span className="font-medium">{detailData.personalDetails?.dob ? new Date(detailData.personalDetails.dob).toLocaleDateString() : '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Gender</span> <span className="font-medium">{detailData.personalDetails?.gender || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Category</span> <span className="font-medium">{detailData.personalDetails?.category || '-'}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-amber-400 font-semibold mb-4 border-b border-white/5 pb-2">Academic Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">CET Number</span> <span className="font-medium">{detailData.personalDetails?.cetNumber || detailData.academicDetails?.cetNumber || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Course Branch</span> <span className="font-medium text-emerald-300">{detailData.academicDetails?.branch || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Qualifying Exam</span> <span className="font-medium">{detailData.academicDetails?.qualifyingExam || '-'}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-blue-400 font-semibold mb-4 border-b border-white/5 pb-2">Family Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Father's Name</span> <span className="font-medium">{detailData.familyDetails?.fatherName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mother's Name</span> <span className="font-medium">{detailData.familyDetails?.motherName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Annual Income</span> <span className="font-medium">{detailData.familyDetails?.annualIncome || '-'}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg">
              <h3 className="text-indigo-400 font-semibold mb-4 border-b border-white/5 pb-2">Contact Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Email</span> <span className="font-medium">{detailData.contactDetails?.email || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span> <span className="font-medium">{detailData.contactDetails?.studentContact || '-'}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg md:col-span-2">
              <h3 className="text-indigo-400 font-semibold mb-4 border-b border-white/5 pb-2">Documents Uploaded</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {[
                  { key: 'aadhaar', label: 'Aadhaar' },
                  { key: 'marksCard', label: 'Marks Card' },
                  { key: 'photo', label: 'Photo' }
                ].map(({ key, label }) => {
                  const documentSource = detailData.documents?.[key];
                  const previewSource = resolveDocumentSource(documentSource);
                  const uploaded = Boolean(documentSource);
                  const isImage = /^data:image\//i.test(previewSource) || /\.(png|jpe?g|gif|webp)(?:\?|$)/i.test(previewSource);
                  return (
                    <div key={key} className="rounded-xl border border-slate-700 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-300">{label}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${uploaded ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'}`}>
                          {uploaded ? 'Uploaded' : 'Missing'}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-gray-400">{previewSource ? 'Select preview to view the uploaded file.' : uploaded ? 'Upload is recorded, but this profile has no document file to preview.' : 'No file uploaded yet.'}</p>
                      {previewSource && isImage && <button type="button" onClick={() => setPreviewDocument({ label, src: previewSource })} className="mt-3 block w-full overflow-hidden rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700"><img src={previewSource} alt={`${label} preview`} className="h-32 w-full object-contain" /></button>}
                      {previewSource && <button type="button" onClick={() => setPreviewDocument({ label, src: previewSource })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-500 hover:bg-indigo-500/10"><Eye size={14} /> View document</button>}
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                        {uploadingDocument === key ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploadingDocument === key ? 'Uploading…' : uploaded ? 'Replace document' : 'Upload document'}
                        <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={Boolean(uploadingDocument)} onChange={(event) => { handleDocumentUpload(key, event.target.files?.[0]); event.target.value = ''; }} />
                      </label>
                      <span className="ml-2 text-[10px] text-gray-500">PDF/JPG/PNG · max 5 MB</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStatus = () => (
    <div className="animate-fade-in space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg max-w-3xl mx-auto mt-10">
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <Shield className="text-indigo-400" /> Academic Details
        </h2>
        {statusObj ? (
          <div>
            <div className="pt-2">
              <h3 className="font-semibold text-lg mb-3">Year-wise Admission Records</h3>
              {statusObj.yearWise?.length ? (
                <div className="space-y-3">
                  {statusObj.yearWise.map((record, index) => {
                    const status = record.admissionStatus || 'Pending';
                    const isConfirmed = ['Active', 'Confirmed', 'Graduated'].includes(status);
                    return (
                      <div key={`${record.academicYear}-${record.studyYear}-${index}`} className="rounded-xl border border-white/5 bg-black/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-200">{record.academicYear || 'Academic year not set'}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Year {record.studyYear || '-'}{record.semester ? ` · Semester ${record.semester}` : ''}
                          </p>
                          {record.remarks && <p className="text-xs text-gray-500 mt-1">{record.remarks}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <span className={`px-3 py-1 rounded-full font-semibold text-xs border ${isConfirmed ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'}`}>
                            {status}
                          </span>
                          {record.promotionStatus && record.promotionStatus !== 'Not Started' && (
                            <span className="px-3 py-1 rounded-full font-semibold text-xs border bg-indigo-500/10 border-indigo-500/20 text-indigo-300">
                              {record.promotionStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-gray-500">No year-wise admission records are available yet.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-gray-400">Admission status is not available right now. Please refresh to try again.</p>
        )}
      </div>
    </div>
  );

  const renderFee = () => {
    const feeYears = feeObj?.yearWise || [];

    return (
      <div className="animate-fade-in space-y-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-lg max-w-4xl mx-auto mt-10">
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <CreditCard className="text-amber-400" /> Fee Status Year-Wise
          </h2>

          <div className="space-y-5">
            {feeYears.length === 0 ? (
              <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-gray-400">No annual fee records are available yet. Please contact the office if you expect your fee details to appear here.</p>
            ) : feeYears.map((year, index) => {
              const studyYear = Number(year.studyYear || index + 1);
              const total = Number(year.totalFee ?? 0);
              const actualPaid = Number(year.paidFee ?? year.amountPaid ?? 0);
              const paid = actualPaid;
              const pending = Number(year.pendingFee ?? Math.max(total - actualPaid, 0));
              const paidDate = year.paidOn || year.paidDate || year.date || 'Not available';
              const status = year.status || (total <= 0 ? 'Not Set' : pending === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');

              return (
                <div key={`${year.academicYear || 'year'}-${index}`} className="rounded-xl border border-white/5 bg-black/20 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-200">{year.academicYear || `Year ${year.studyYear || index + 1}`}</p>
                      <p className="text-sm text-gray-500">
                        Year {year.studyYear || index + 1}{year.semester ? ` · Semester ${year.semester}` : ''}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      status === 'Paid' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                      status === 'Partial' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                      status === 'Not Set' ? 'bg-slate-500/15 border-slate-500/30 text-slate-400' :
                      'bg-red-500/15 border-red-500/30 text-red-400'
                    }`}>
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                      <div className="text-gray-400 mb-1">Total Fee</div>
                      <div className="text-lg font-bold text-white">₹{total.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                      <div className="text-gray-400 mb-1">Amount Paid</div>
                      <div className="text-lg font-bold text-emerald-400">₹{paid.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                      <div className="text-gray-400 mb-1">Pending Fee</div>
                      <div className="text-lg font-bold text-amber-300">₹{pending.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                      <div className="text-gray-400 mb-1">Paid On</div>
                      <div className="text-base font-semibold text-indigo-300">
                        {paidDate !== 'Not available' ? new Date(paidDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="student-dashboard flex h-screen bg-[#0a0a0b] text-slate-200 font-sans">
      
      {/* Side Navigation */}
      <aside className="w-64 bg-slate-900/80 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 font-bold text-indigo-400 flex items-center justify-center border border-indigo-500/40">
              S
            </div>
            <div>
              <h2 className="font-bold text-white leading-tight">Student</h2>
              <p className="text-xs text-emerald-500 font-medium">Verified Profile</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'home', icon: Home, label: 'Dashboard Home' },
            { id: 'details', icon: FileText, label: 'Admission Details' },
            { id: 'status', icon: CheckCircle, label: 'Admission Status' },
            { id: 'fee', icon: CreditCard, label: 'Fee Status' },
            { id: 'fee-structure', icon: BookOpen, label: 'Fee Structure' },
            { id: 'password', icon: Shield, label: 'Change Password' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} /> {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/40 border-b border-white/5 px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white capitalize leading-none tracking-wide">
            {activeTab.replace('-', ' ')}
          </h1>
          <div className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            Session Active
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-full flex flex-col shadow-inner items-center justify-center text-indigo-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Fetching Student Records...</p>
            </div>
          ) : (
            <>
              {activeTab === 'home' && renderHome()}
              {activeTab === 'details' && renderDetails()}
              {activeTab === 'status' && renderStatus()}
              {activeTab === 'fee' && renderFee()}
              {activeTab === 'fee-structure' && <FeeStructure />}
              {activeTab === 'lifecycle' && renderHome()}
              {activeTab === 'password' && renderPassword()}
            </>
          )}
        </div>
      </main>

      {previewDocument && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label={`${previewDocument.label} preview`}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-600 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900">{previewDocument.label} preview</h2>
              <button type="button" onClick={() => setPreviewDocument(null)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Close</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              {/^(data:application\/pdf|.*\.pdf(?:\?|$))/i.test(previewDocument.src) ? (
                <iframe title={`${previewDocument.label} PDF`} src={previewDocument.src} className="h-[72vh] w-full rounded-lg bg-white" />
              ) : (
                <img src={previewDocument.src} alt={`${previewDocument.label} document`} className="mx-auto max-h-[72vh] max-w-full rounded-lg object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
