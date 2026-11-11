import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BookOpenCheck,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Trash2,
  Upload,
  KeyRound,
  X
} from 'lucide-react';

const API_URL = '/api/office/lateral-entry-students';
const branchesFallback = ['CSE', 'ECE', 'ME', 'Civil'];
const currentYear = new Date().getFullYear();

const emptyForm = {
  studentName: '',
  email: '',
  phone: '',
  admissionYear: currentYear,
  academicBatch: `${currentYear}-${String(currentYear + 4).slice(-2)}`,
  branch: 'CSE',
  previousQualification: 'Diploma',
  previousCollege: '',
  previousUniversity: '',
  joiningSemester: 3,
  diplomaPercentage: '',
  universitySeatNumber: '',
  feeStatus: 'Pending',
  totalFee: 85000,
  paidFee: 0,
  status: 'Active',
  academicProgress: {
    semester: 3,
    cgpa: 0,
    creditsEarned: 0,
    backlogs: 0,
    mentorRemarks: ''
  },
  documents: []
};

const currency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function LateralEntryManagement() {
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState(branchesFallback);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterFee, setFilterFee] = useState('All');
  const [formData, setFormData] = useState(emptyForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const canManage = ['office', 'Office', 'Staff'].includes(userRole);

  const admissionYears = useMemo(() => {
    const years = new Set([currentYear, currentYear - 1, currentYear - 2]);
    students.forEach((student) => years.add(student.admissionYear));
    return [...years].sort((a, b) => b - a);
  }, [students]);

  const summary = useMemo(() => {
    const paid = students.filter((student) => student.feeStatus === 'Paid').length;
    const pending = students.filter((student) => student.feeStatus === 'Pending').length;
    const totalPaid = students.reduce((sum, student) => sum + Number(student.paidFee || 0), 0);
    return { total: students.length, paid, pending, totalPaid };
  }, [students]);

  useEffect(() => {
    fetchStudents();
  }, [filterBranch, filterYear, filterFee]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL, {
        headers: authHeaders,
        params: {
          search,
          branch: filterBranch,
          admissionYear: filterYear,
          feeStatus: filterFee
        }
      });
      setStudents(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load lateral entry students');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/office/settings', { headers: authHeaders });
      if (res.data.departments) setBranches(res.data.departments);
    } catch {
      setBranches(branchesFallback);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateProgress = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      academicProgress: { ...prev.academicProgress, [field]: value }
    }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 2MB`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          documents: [
            ...prev.documents,
            { name: file.name, type: file.type || 'Document', data: reader.result }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const openCreate = () => {
    setEditingStudent(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      ...emptyForm,
      ...student,
      academicProgress: { ...emptyForm.academicProgress, ...(student.academicProgress || {}) },
      documents: student.documents || []
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) {
      toast.error('Only Office Admin can manage lateral entry records');
      return;
    }

    const payload = {
      ...formData,
      admissionYear: Number(formData.admissionYear),
      diplomaPercentage: Number(formData.diplomaPercentage) || 0,
      totalFee: Number(formData.totalFee) || 0,
      paidFee: Number(formData.paidFee) || 0,
      academicProgress: {
        ...formData.academicProgress,
        semester: Number(formData.academicProgress.semester) || 3,
        cgpa: Number(formData.academicProgress.cgpa) || 0,
        creditsEarned: Number(formData.academicProgress.creditsEarned) || 0,
        backlogs: Number(formData.academicProgress.backlogs) || 0
      }
    };

    try {
      if (editingStudent) {
        await axios.put(`${API_URL}/${editingStudent._id}`, payload, { headers: authHeaders });
        toast.success('Lateral entry profile updated');
      } else {
        const response = await axios.post(API_URL, payload, { headers: authHeaders });
        setCredentials({ studentName: response.data.student.studentName, ...response.data.credentials });
        toast.success('Lateral entry student added');
      }
      setShowForm(false);
      setEditingStudent(null);
      setFormData(emptyForm);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to save lateral entry profile');
    }
  };

  const viewCredentials = async (student) => {
    const targetId = student._id || student.id || student.studentId;
    try {
      const response = await axios.get(`${API_URL}/${targetId}/credentials`, { headers: authHeaders });
      setCredentials({
        studentName: response.data.studentName || student.studentName || 'Student',
        username: response.data.username || student.studentId || student.id || 'CET2026',
        password: response.data.password || student.credentials?.initialPassword || 'student123'
      });
    } catch (err) {
      setCredentials({
        studentName: student.studentName || student.name || 'Student',
        username: student.studentId || student.id || 'CET2026',
        password: student.credentials?.initialPassword || 'student123'
      });
    }
  };

  const handleDelete = async () => {
    if (!canManage) {
      toast.error('Only Office Admin can delete records');
      return;
    }

    try {
      await axios.delete(`${API_URL}/${deleteTarget._id}`, { headers: authHeaders });
      toast.success('Lateral entry record deleted');
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const exportRows = students.map((student) => [
    student.admissionNumber,
    student.studentName,
    student.branch,
    student.admissionYear,
    `Direct to ${student.directAdmissionYear || 2}nd Year`,
    student.previousQualification,
    student.previousCollege,
    student.feeStatus,
    student.academicProgress?.semester || 3,
    student.academicProgress?.cgpa || 0
  ]);

  const exportPdf = () => {
    if (students.length === 0) return toast.error('No rows available to export');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Lateral Entry Student Report', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);
    autoTable(doc, {
      startY: 30,
      head: [['Admission No', 'Student', 'Branch', 'Year', 'Entry', 'Qualification', 'Previous College', 'Fee', 'Sem', 'CGPA']],
      body: exportRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`lateral_entry_students_${Date.now()}.pdf`);
  };

  const exportExcel = () => {
    if (students.length === 0) return toast.error('No rows available to export');
    const header = ['Admission No', 'Student', 'Branch', 'Admission Year', 'Entry', 'Qualification', 'Previous College', 'Fee Status', 'Semester', 'CGPA'];
    const table = [header, ...exportRows]
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '').replace(/[<>]/g, '')}</td>`).join('')}</tr>`)
      .join('');
    const blob = new Blob([`<table>${table}</table>`], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lateral_entry_students_${Date.now()}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <BookOpenCheck size={16} /> Lateral Entry Student Management
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">Direct Admission to 2nd Year</h2>
            <p className="text-xs text-slate-400 mt-1">Manage diploma/transfer admissions, documents, fee status, and academic progress.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={exportPdf} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700">
              <FileText size={15} /> PDF
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700">
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15">
              <Plus size={15} /> Add Lateral Entry
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Total Records" value={summary.total} />
          <Metric label="Fully Paid" value={summary.paid} tone="text-emerald-400" />
          <Metric label="Pending Fees" value={summary.pending} tone="text-amber-400" />
          <Metric label="Fee Collected" value={currency(summary.totalPaid)} tone="text-blue-400" />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4">
        <form onSubmit={(event) => { event.preventDefault(); fetchStudents(); }} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, admission no, email, phone, previous college"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-slate-100 focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap gap-3">
          <Select value={filterBranch} onChange={setFilterBranch} options={['All', ...branches]} labelPrefix="Branch" />
          <Select value={filterYear} onChange={setFilterYear} options={['All', ...admissionYears]} labelPrefix="Year" />
          <Select value={filterFee} onChange={setFilterFee} options={['All', 'Paid', 'Partial', 'Pending']} labelPrefix="Fee" />
          <button onClick={fetchStudents} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 border border-slate-700">
            Search
          </button>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin mx-auto mb-3"></div>
            <p className="text-xs">Loading lateral entry records...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">No lateral entry students match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/40 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Admission</th>
                  <th className="p-4">Previous Qualification</th>
                  <th className="p-4">Fee Status</th>
                  <th className="p-4">Academic Progress</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-900/40">
                    <td className="p-4 pl-6">
                      <span className="block text-xs font-bold text-slate-100">{student.studentName}</span>
                      <span className="block text-[10px] text-slate-400">{student.email} | {student.phone}</span>
                    </td>
                    <td className="p-4">
                      <span className="block text-xs font-semibold text-blue-400">{student.admissionNumber}</span>
                      <span className="block text-[10px] text-slate-400">{student.studentId} | {student.academicBatch} | {student.branch}</span>
                    </td>
                    <td className="p-4">
                      <span className="block text-xs text-slate-200">{student.previousQualification}</span>
                      <span className="block text-[10px] text-slate-400 max-w-56 truncate">{student.previousCollege}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={student.feeStatus} />
                      <span className="block text-[10px] text-slate-400 mt-1">{currency(student.paidFee)} / {currency(student.totalFee)}</span>
                    </td>
                    <td className="p-4 text-xs text-slate-300">
                      Sem {student.academicProgress?.semester || 3} | CGPA {student.academicProgress?.cgpa || 0}
                      <span className="block text-[10px] text-slate-500">{student.academicProgress?.backlogs || 0} backlogs</span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-1.5">
                      <IconButton title="View Profile" onClick={() => setViewStudent(student)} icon={Eye} />
                      <IconButton title="Edit" onClick={() => openEdit(student)} icon={Edit2} tone="blue" />
                      <IconButton title="View login credentials" onClick={() => viewCredentials(student)} icon={KeyRound} tone="blue" />
                      <IconButton title="Delete" onClick={() => setDeleteTarget(student)} icon={Trash2} tone="rose" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingStudent ? 'Edit Lateral Entry Student' : 'Add Lateral Entry Student'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection title="Student & Admission Details">
              <TextInput label="Student Name" value={formData.studentName} onChange={(value) => updateField('studentName', value)} required />
              <TextInput label="Email" type="email" value={formData.email} onChange={(value) => updateField('email', value)} required />
              <TextInput label="Phone" value={formData.phone} onChange={(value) => updateField('phone', value)} required />
              <TextInput label="Admission Year" type="number" value={formData.admissionYear} onChange={(value) => updateField('admissionYear', value)} required />
              <TextInput label="Academic Batch" value={formData.academicBatch} onChange={(value) => updateField('academicBatch', value)} placeholder="2024-28" required />
              <SelectInput label="Branch" value={formData.branch} onChange={(value) => updateField('branch', value)} options={branches} />
              <TextInput label="Joining Semester" type="number" value={formData.joiningSemester} onChange={(value) => updateField('joiningSemester', value)} required />
            </FormSection>

            <FormSection title="Previous Qualification">
              <TextInput label="Previous Qualification" value={formData.previousQualification} onChange={(value) => updateField('previousQualification', value)} required />
              <TextInput label="Previous College" value={formData.previousCollege} onChange={(value) => updateField('previousCollege', value)} required />
              <TextInput label="Previous University" value={formData.previousUniversity} onChange={(value) => updateField('previousUniversity', value)} />
              <TextInput label="Diploma / Qualifying %" type="number" value={formData.diplomaPercentage} onChange={(value) => updateField('diplomaPercentage', value)} />
              <TextInput label="University Seat Number" value={formData.universitySeatNumber} onChange={(value) => updateField('universitySeatNumber', value)} />
            </FormSection>

            <FormSection title="Fees & Academic Progress">
              <SelectInput label="Fee Status" value={formData.feeStatus} onChange={(value) => updateField('feeStatus', value)} options={['Paid', 'Partial', 'Pending']} />
              <TextInput label="Total Fee" type="number" value={formData.totalFee} onChange={(value) => updateField('totalFee', value)} />
              <TextInput label="Paid Fee" type="number" value={formData.paidFee} onChange={(value) => updateField('paidFee', value)} />
              <TextInput label="Current Semester" type="number" value={formData.academicProgress.semester} onChange={(value) => updateProgress('semester', value)} />
              <TextInput label="CGPA" type="number" step="0.01" value={formData.academicProgress.cgpa} onChange={(value) => updateProgress('cgpa', value)} />
              <TextInput label="Backlogs" type="number" value={formData.academicProgress.backlogs} onChange={(value) => updateProgress('backlogs', value)} />
            </FormSection>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block mb-2">Mentor Remarks</label>
              <textarea
                value={formData.academicProgress.mentorRemarks}
                onChange={(event) => updateProgress('mentorRemarks', event.target.value)}
                className="w-full min-h-20 px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100"
              />
            </div>

            <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Uploaded Documents</h4>
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 cursor-pointer">
                  <Upload size={14} /> Upload
                  <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.documents.length === 0 ? (
                  <span className="text-xs text-slate-500">No documents uploaded yet.</span>
                ) : (
                  formData.documents.map((doc, index) => (
                    <span key={`${doc.name}-${index}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
                      <FileText size={13} className="text-blue-400" /> {doc.name}
                      <button type="button" onClick={() => removeDocument(index)} className="text-rose-400"><X size={13} /></button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white">Save Record</button>
            </div>
          </form>
        </Modal>
      )}

      {viewStudent && (
        <Modal title="Lateral Entry Student Profile" onClose={() => setViewStudent(null)} wide>
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-950/30 border border-slate-800 rounded-2xl p-5">
              <div>
                <h3 className="text-xl font-bold text-slate-100">{viewStudent.studentName}</h3>
                <p className="text-xs text-blue-400 mt-1">{viewStudent.admissionNumber} | {viewStudent.branch} | Direct to 2nd Year</p>
                <p className="text-xs text-slate-400 mt-1">{viewStudent.email} | {viewStudent.phone}</p>
              </div>
              <StatusBadge status={viewStudent.feeStatus} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProfilePanel title="Previous Education" rows={[
                ['Qualification', viewStudent.previousQualification],
                ['Previous College', viewStudent.previousCollege],
                ['Qualifying Percentage', `${viewStudent.diplomaPercentage || 0}%`],
                ['Seat Number', viewStudent.universitySeatNumber || 'Not recorded']
              ]} />
              <ProfilePanel title="Academic Progress" rows={[
                ['Current Semester', viewStudent.academicProgress?.semester || 3],
                ['CGPA', viewStudent.academicProgress?.cgpa || 0],
                ['Credits Earned', viewStudent.academicProgress?.creditsEarned || 0],
                ['Backlogs', viewStudent.academicProgress?.backlogs || 0],
                ['Remarks', viewStudent.academicProgress?.mentorRemarks || 'No remarks']
              ]} />
              <ProfilePanel title="Fee Ledger" rows={[
                ['Total Fee', currency(viewStudent.totalFee)],
                ['Paid Fee', currency(viewStudent.paidFee)],
                ['Pending Fee', currency(Number(viewStudent.totalFee || 0) - Number(viewStudent.paidFee || 0))],
                ['Fee Status', viewStudent.feeStatus]
              ]} />
              <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-3">Documents</h4>
                <div className="space-y-2">
                  {(viewStudent.documents || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No uploaded documents.</p>
                  ) : (
                    viewStudent.documents.map((doc, index) => (
                      <a key={`${doc.name}-${index}`} href={doc.data} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-blue-400 font-semibold">
                        <Download size={14} /> {doc.name}
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {credentials && (
        <Modal title="Student Login Credentials" onClose={() => setCredentials(null)}>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-100">{credentials.studentName}</p>
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-400">Username</span><code className="text-blue-300 font-bold">{credentials.username}</code></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Initial password</span><code className="text-blue-300 font-bold">{credentials.password || 'Already changed by student'}</code></div>
            </div>
            <p className="text-xs text-slate-400">Share this securely. The student can change this password after first login.</p>
            <div className="flex gap-3"><button onClick={() => window.print()} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200">Print</button><button onClick={() => setCredentials(null)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white">Done</button></div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Lateral Entry Record" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-400 mb-5">This will permanently remove {deleteTarget.studentName}'s lateral entry profile.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metric({ label, value, tone = 'text-slate-100' }) {
  return (
    <div className="bg-slate-950/30 border border-slate-800 rounded-2xl p-4">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</span>
      <div className={`text-lg font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}

function Select({ value, onChange, options, labelPrefix }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-slate-200">
      {options.map((option) => (
        <option key={option} value={option}>{option === 'All' ? `All ${labelPrefix}` : option}</option>
      ))}
    </select>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Partial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  };
  return <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold border ${styles[status] || styles.Pending}`}>{status}</span>;
}

function IconButton({ icon: Icon, onClick, title, tone = 'slate' }) {
  const toneClass = tone === 'blue' ? 'text-blue-400 border-blue-500/20 bg-blue-600/10 hover:bg-blue-600/20' : tone === 'rose' ? 'text-rose-400 border-rose-500/20 bg-rose-600/10 hover:bg-rose-600/20' : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700';
  return (
    <button onClick={onClick} title={title} className={`inline-flex p-1.5 rounded-lg border ${toneClass}`}>
      {React.createElement(Icon, { size: 14 })}
    </button>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl p-6 my-8 max-h-[86vh] overflow-y-auto w-full ${wide ? 'max-w-5xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function TextInput({ label, value, onChange, type = 'text', required = false, disabled = false, step }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-400 block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100 disabled:opacity-60"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-400 block mb-1">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-100">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProfilePanel({ title, rows }) {
  return (
    <div className="bg-slate-950/20 border border-slate-800 rounded-2xl p-5">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-3">{title}</h4>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-xs border-b border-slate-800/60 pb-2 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-200 font-semibold text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
