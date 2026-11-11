import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, CreditCard, Receipt, FileText, CheckCircle, Clock, AlertTriangle, Printer } from 'lucide-react';
import { ACCOUNT_OPTIONS, summarizeAccountPayments } from '../../utils/feeAccountBreakdown';

const getScheduledFee = (student, year) => {
  const branch = String(student?.academicDetails?.branch || '').toLowerCase();
  const cvMe = branch.includes('civil') || branch.includes('mechanical') || branch === 'me' || branch === 'cv';
  const lateral = student?.admissionType === 'Lateral Entry' || student?.academicDetails?.lateralEntry === 'Yes';
  const idpTuitionFee = year === 1 ? 33150 : year === 2 ? (cvMe ? 17300 : 33150) : year === 3 ? (lateral ? (cvMe ? 17300 : 33800) : 30916) : (lateral ? 32960 : 28910);
  const fee = { idpTuitionFee, vtuAdmissionFee: 3560, vtuInsuranceFee: year === 4 ? 570 : 670, pdFee: 330, snqAdjustment: 0 };
  if (student?.contactDetails?.snqQuota === 'Yes' && year >= 2) {
    fee.snqAdjustment = idpTuitionFee + fee.vtuAdmissionFee + fee.vtuInsuranceFee + fee.pdFee - (year === 4 ? 14460 : 14560);
  }
  return fee;
};

const isAdmissionFeeRecord = (payment) =>
  String(payment?.paymentMode || '').trim().toLowerCase() === 'admission record' ||
  /^ADMISSION-/i.test(String(payment?.transactionId || '')) ||
  /^admission fee collected/i.test(String(payment?.remarks || ''));

export default function FeeManagement() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Payment Form States
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentAccount, setPaymentAccount] = useState('PD A/C');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receiptUpload, setReceiptUpload] = useState(null);
  const [uploadingReceiptNumber, setUploadingReceiptNumber] = useState('');
  const [uploadingAllocationAccount, setUploadingAllocationAccount] = useState('');
  const [allocationReceiptNames, setAllocationReceiptNames] = useState({});
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [feeBreakdown, setFeeBreakdown] = useState(getScheduledFee(null, 1));
  const [annualLedger, setAnnualLedger] = useState({ totalFee: 0, paidAmount: 0, outstandingBalance: 0 });
  const [editingFee, setEditingFee] = useState(false);
  const [feeStudyYear, setFeeStudyYear] = useState('1');
  const [savingAnnualFee, setSavingAnnualFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Receipt Preview
  const [activeReceipt, setActiveReceipt] = useState(null);
  const batchYear = Number(selectedStudent?.admissionBatch);
  const selectedYearStart = Number.isInteger(batchYear)
    ? batchYear + Number(feeStudyYear) - (selectedStudent?.admissionType === 'Lateral Entry' ? 2 : 1)
    : null;
  const selectedAcademicYearLabel = selectedYearStart ? `${selectedYearStart}-${selectedYearStart + 1}` : selectedAcademicYear || selectedStudent?.currentAcademicYear;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fee management only for approved students
      setStudents(res.data.filter(s => s.approvalStatus === 'Approved'));
    } catch {
      toast.error('Failed to load student ledger database');
    }
  };

  const loadFeeBreakdown = async (student, year) => {
    setAllocationReceiptNames({});
    const scheduled = getScheduledFee(student, year);
    setFeeBreakdown(scheduled);
    const scheduledTotal = Number(scheduled.idpTuitionFee) + Number(scheduled.vtuAdmissionFee) + Number(scheduled.vtuInsuranceFee) + Number(scheduled.pdFee) - Number(scheduled.snqAdjustment || 0);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/office/fees/annual/${student._id}`, {
        params: { studyYear: year, defaultTotal: scheduledTotal }, headers: { Authorization: `Bearer ${token}` }
      });
      const breakdown = response.data.breakdown || scheduled;
      if (response.data.academicYear) setSelectedAcademicYear(response.data.academicYear);
      setAllocationReceiptNames(response.data.accountReceipts || {});
      const totalFee = Number(response.data.totalFee) || scheduledTotal;
      setFeeBreakdown(breakdown);
      setAnnualLedger({
        totalFee,
        paidAmount: Number(response.data.paidAmount || 0),
        outstandingBalance: Math.max(0, totalFee - Number(response.data.paidAmount || 0))
      });
    } catch {
      const history = (student.feeHistory || []).filter((payment) =>
        String(payment.account || '').toUpperCase() !== 'KEA' && !isAdmissionFeeRecord(payment) && (
          Number(payment.studyYear) === Number(year) ||
          (Number(year) === 1 && !payment.studyYear && !payment.academicYear && /admission.*(initial deposit|fee collected)|initial.*admission/i.test(String(payment.remarks || '')))
        )
      );
      const paidAmount = history.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      setAnnualLedger({ totalFee: scheduledTotal, paidAmount, outstandingBalance: Math.max(0, scheduledTotal - paidAmount) });
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setAnnualLedger({ totalFee: 0, paidAmount: 0, outstandingBalance: 0 });
    setAmount('');
    setPaymentAccount('PD A/C');
    setTransactionId('');
    setRemarks('');
    setReceiptUpload(null);
    setFeeStudyYear(String(Math.min(4, Math.max(1, Number(student.currentStudyYear || student.academicDetails?.year || 1)))));
    const year = Number(student.currentStudyYear || student.academicDetails?.year || 1);
    setFeeStudyYear(String(year));
    if (student.admissionBatch) {
      const firstYear = student.admissionType === 'Lateral Entry' ? 2 : 1;
      const start = Number(student.admissionBatch) + year - firstYear;
      setSelectedAcademicYear(`${start}-${start + 1}`);
    }
    loadFeeBreakdown(student, year);
    setEditingFee(false);
    setActiveReceipt(null);
  };

  const handleSaveAnnualFee = async (e) => {
    e.preventDefault();
    if (Object.values(feeBreakdown).some((amount) => !Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      toast.error('Enter valid non-negative fee amounts');
      return;
    }
    setSavingAnnualFee(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/office/fees/annual/${selectedStudent._id}`, { breakdown: feeBreakdown, studyYear: Number(feeStudyYear) }, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedStudent(res.data.student);
      setAnnualLedger({
        totalFee: Number(res.data.fee.totalFee || 0),
        paidAmount: Number(res.data.fee.paidAmount || 0),
        outstandingBalance: Number(res.data.fee.outstandingBalance || 0)
      });
      setEditingFee(false);
      setStudents((current) => current.map((student) => student._id === res.data.student._id ? res.data.student : student));
      toast.success(`Year ${feeStudyYear} annual fee saved`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save annual fee');
    } finally {
      setSavingAnnualFee(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }

    if (payAmt > annualLedger.outstandingBalance) {
      toast.error(`Amount exceeds this year's remaining due of Rs. ${annualLedger.outstandingBalance.toLocaleString('en-IN')}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/office/fees/pay', {
        studentId: selectedStudent._id,
        amount: payAmt,
        paymentMode,
        account: paymentAccount,
        studyYear: Number(feeStudyYear),
        totalFee: annualLedger.totalFee,
        breakdown: feeBreakdown,
        transactionId,
        remarks,
        receiptData: receiptUpload?.data || '',
        receiptFileName: receiptUpload?.name || '',
        receiptMimeType: receiptUpload?.type || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Fee installment recorded in database!');
      
      // Select the last added transaction for receipt generation
      const updatedStudent = res.data.student;
      setSelectedStudent(updatedStudent);
      if (res.data.annualFee) {
        setAnnualLedger({
          totalFee: Number(res.data.annualFee.totalFee || annualLedger.totalFee),
          paidAmount: Number(res.data.annualFee.paidAmount || 0),
          outstandingBalance: Number(res.data.annualFee.outstandingBalance || 0)
        });
      }
      const lastTx = updatedStudent.feeHistory[updatedStudent.feeHistory.length - 1];
      setActiveReceipt({
        studentName: updatedStudent.personalDetails.studentName,
        admissionNumber: updatedStudent.admissionNumber,
        branch: updatedStudent.academicDetails.branch,
        amount: lastTx.amount,
        date: lastTx.date,
        transactionId: lastTx.transactionId,
        receiptNumber: lastTx.receiptNumber,
        paymentMode: lastTx.paymentMode,
        remarks: lastTx.remarks,
        totalPaid: Number(res.data.annualFee?.paidAmount || 0),
        totalDue: Number(res.data.annualFee?.outstandingBalance || 0),
        account: lastTx.account
      });

      setAmount('');
      setTransactionId('');
      setRemarks('');
      setReceiptUpload(null);
      fetchStudents(); // Refresh data grid
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReceiptUpload = (file) => {
    if (!file) { setReceiptUpload(null); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Upload a PDF, JPG, or PNG receipt.');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      toast.error('Receipt must be smaller than 4.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReceiptUpload({ data: reader.result, name: file.name, type: file.type });
    reader.onerror = () => toast.error('Could not read the receipt file.');
    reader.readAsDataURL(file);
  };

  const downloadUploadedReceipt = async (receiptNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/office/fees/receipt/${encodeURIComponent(receiptNumber)}`, { headers: { Authorization: `Bearer ${token}` } });
      const link = document.createElement('a');
      link.href = response.data.receiptData;
      link.download = response.data.fileName || `fee-receipt-${receiptNumber}`;
      link.click();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not download uploaded receipt.');
    }
  };

  const uploadReceiptForPayment = (receiptNumber, file) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Upload a PDF, JPG, or PNG receipt.');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      toast.error('Receipt must be smaller than 4.5 MB.');
      return;
    }

    const reader = new FileReader();
    setUploadingReceiptNumber(receiptNumber);
    reader.onload = async () => {
      try {
        const token = localStorage.getItem('token');
        await axios.put(
          '/api/office/fees/receipt/' + encodeURIComponent(receiptNumber),
          { receiptData: reader.result, receiptFileName: file.name, receiptMimeType: file.type },
          { headers: { Authorization: 'Bearer ' + token } }
        );
        const updateReceiptMetadata = (student) => ({
          ...student,
          feeHistory: (student.feeHistory || []).map((payment) =>
            payment.receiptNumber === receiptNumber
              ? { ...payment, receiptFileName: file.name, receiptMimeType: file.type }
              : payment
          )
        });
        setSelectedStudent((student) => student ? updateReceiptMetadata(student) : student);
        setStudents((current) => current.map((student) =>
          student._id === selectedStudent?._id ? updateReceiptMetadata(student) : student
        ));
        toast.success('Receipt uploaded for this payment.');
      } catch (error) {
        toast.error(error.response?.data?.error || 'Could not upload receipt.');
      } finally {
        setUploadingReceiptNumber('');
      }
    };
    reader.onerror = () => {
      toast.error('Could not read the receipt file.');
      setUploadingReceiptNumber('');
    };
    reader.readAsDataURL(file);
  };

  const uploadAllocationReceipt = (account, file) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Upload a PDF, JPG, or PNG receipt.');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      toast.error('Receipt must be smaller than 4.5 MB.');
      return;
    }
    const reader = new FileReader();
    setUploadingAllocationAccount(account);
    reader.onload = async () => {
      try {
        const token = localStorage.getItem('token');
        const route = `/api/office/fees/account-receipt/${encodeURIComponent(selectedStudent._id)}/${feeStudyYear}/${encodeURIComponent(account)}`;
        const response = await axios.put(route, { receiptData: reader.result, receiptFileName: file.name, receiptMimeType: file.type }, { headers: { Authorization: `Bearer ${token}` } });
        setAllocationReceiptNames((current) => ({ ...current, [account]: response.data.fileName || file.name }));
        toast.success('Receipt uploaded for this account.');
      } catch (error) {
        toast.error(error.response?.data?.error || 'Could not upload receipt.');
      } finally {
        setUploadingAllocationAccount('');
      }
    };
    reader.onerror = () => {
      toast.error('Could not read the receipt file.');
      setUploadingAllocationAccount('');
    };
    reader.readAsDataURL(file);
  };

  const downloadAllocationReceipt = async (account) => {
    try {
      const token = localStorage.getItem('token');
      const route = `/api/office/fees/account-receipt/${encodeURIComponent(selectedStudent._id)}/${feeStudyYear}/${encodeURIComponent(account)}`;
      const response = await axios.get(route, { headers: { Authorization: `Bearer ${token}` } });
      const link = document.createElement('a');
      link.href = response.data.receiptData;
      link.download = response.data.fileName || `fee-receipt-${account.replaceAll('/', '-')}`;
      link.click();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not download uploaded receipt.');
    }
  };

  const filteredStudents = students.filter(s => 
    s.personalDetails.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.personalDetails.cetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedYearPayments = (selectedStudent?.feeHistory || []).filter((payment) =>
    String(payment.account || '').toUpperCase() !== 'KEA' && (
      Number(payment.studyYear) === Number(feeStudyYear) ||
      (Number(feeStudyYear) === 1 && !payment.studyYear && !payment.academicYear && /admission.*(initial deposit|fee collected)|initial.*admission/i.test(String(payment.remarks || '')))
    )
  );
  const visibleTransactionPayments = selectedYearPayments.filter((payment) =>
    !isAdmissionFeeRecord(payment)
  );
  const isAnnualFeeFullyCovered = annualLedger.totalFee > 0 && annualLedger.paidAmount >= annualLedger.totalFee;
  const accountBreakdown = isAnnualFeeFullyCovered
    ? {
        idp: Number(feeBreakdown.idpTuitionFee || 0),
        vtu: Number(feeBreakdown.vtuAdmissionFee || 0) + Number(feeBreakdown.vtuInsuranceFee || 0),
        pd: Number(feeBreakdown.pdFee || 0)
      }
    : summarizeAccountPayments(visibleTransactionPayments, {});
  const displayedCollectedAmount = Math.min(annualLedger.paidAmount, annualLedger.totalFee);
  const historyEntries = isAnnualFeeFullyCovered
    ? [
        { key: 'idp', amount: accountBreakdown.idp, account: 'IDP A/C', allocation: true, receiptFileName: allocationReceiptNames['IDP A/C'] },
        { key: 'vtu', amount: accountBreakdown.vtu, account: 'VTU A/C', allocation: true, receiptFileName: allocationReceiptNames['VTU A/C'] },
        { key: 'pd', amount: accountBreakdown.pd, account: 'PD A/C', allocation: true, receiptFileName: allocationReceiptNames['PD A/C'] }
      ].filter((payment) => payment.amount > 0)
    : visibleTransactionPayments;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
      
      {/* Sidebar: Student Finder list */}
      <div className="lg:col-span-4 space-y-6 print:hidden">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-5 shadow-lg flex flex-col h-[75vh]">
          <div className="pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-sm font-bold text-slate-100">Fee Ledger Directory</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Search student name or admission code</p>
            
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
              <input 
                type="text" 
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No active students found</p>
            ) : (
              filteredStudents.map(stud => {
                const isSel = selectedStudent?._id === stud._id;
                // The selected student's badge must use the same annual ledger
                // as the totals shown in the detail panel. feeDetails.pendingFee
                // is a legacy all-years value and can be stale for the current year.
                const hasDue = isSel
                  ? annualLedger.outstandingBalance > 0
                  : Number(stud.feeDetails?.pendingFee || 0) > 0;
                return (
                  <button
                    key={stud._id}
                    onClick={() => handleSelectStudent(stud)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                      isSel ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-950/20 border-slate-850 hover:bg-slate-900/35'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block truncate max-w-[170px]">{stud.personalDetails.studentName}</span>
                      <span className="text-[9px] text-slate-450">{stud.admissionNumber || 'No Admission No.'}</span>
                    </div>
                    {hasDue ? (
                      <span className="text-[8px] bg-amber-500/10 text-amber-550 border border-amber-550/20 px-2 py-0.5 rounded font-bold">DUE</span>
                    ) : (
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">PAID</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Panel: Active Ledger details & Logger */}
      <div className="lg:col-span-8 space-y-6 print:w-full print:p-0">
        {selectedStudent ? (
          <div className="space-y-6">
            
            {/* Account Summary Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg print:hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-100">{selectedStudent.personalDetails.studentName}</h2>
                  <p className="text-[11px] text-slate-400">USN / Admission Number: <span className="font-semibold text-blue-400">{selectedStudent.admissionNumber}</span></p>
                </div>
                <span className="text-xs font-semibold bg-slate-950/40 border px-3 py-1 rounded-xl text-slate-350">{selectedStudent.academicDetails.branch} Dept</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-805">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Total Annual Fee</span>
                  <span className="text-lg font-bold text-slate-200 mt-1 block">Rs. {annualLedger.totalFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-805">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Collected This Year</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">Rs. {displayedCollectedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-805">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Pending This Year</span>
                  <span className="text-lg font-bold text-amber-500 mt-1 block">Rs. {annualLedger.outstandingBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries({
                  idp: { label: 'IDP A/C', amount: accountBreakdown.idp },
                  vtu: { label: 'VTU A/C', amount: accountBreakdown.vtu },
                  pd: { label: 'PD A/C', amount: accountBreakdown.pd }
                }).map(([key, item]) => (
                  <div key={key} className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4 shadow-inner shadow-slate-950/40">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-300">{item.label} collected (Year {feeStudyYear})</div>
                    <div className="mt-2 text-lg font-bold text-slate-100">₹ {Number(item.amount || 0).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Annual Fee Details */}
            <form onSubmit={handleSaveAnnualFee} className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-5 shadow-lg print:hidden">
              <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="text-xs font-bold text-slate-300 uppercase">Annual fee details</h3><p className="text-[10px] text-slate-500 mt-1">KEA admission deposits are recorded separately from annual fee totals. Edit the fee components before saving.</p></div><button type="button" onClick={() => { if (editingFee) loadFeeBreakdown(selectedStudent, Number(feeStudyYear)); setEditingFee((value) => !value); }} className="px-3 py-1.5 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold">{editingFee ? 'Cancel edit' : Number(feeStudyYear) === 1 ? 'Edit Year 1 fee' : 'Edit fee'}</button></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div><label className="text-[10px] text-slate-300 block mb-1 font-semibold">Study year · Academic year</label><select value={feeStudyYear} onChange={(e) => { setFeeStudyYear(e.target.value); loadFeeBreakdown(selectedStudent, Number(e.target.value)); setEditingFee(false); }} className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-xs text-slate-100">{[1, 2, 3, 4].map((year) => { const start = Number(selectedStudent?.admissionBatch) + year - (selectedStudent?.admissionType === 'Lateral Entry' ? 2 : 1); return <option key={year} value={year}>Year {year}{selectedStudent?.admissionBatch ? ` · ${start}-${start + 1}` : ''}</option>; })}</select><p className="text-[10px] text-blue-300 mt-1">Recording fee for {selectedAcademicYearLabel}</p></div>
                {[['idpTuitionFee', 'IDP A/C tuition'], ['vtuAdmissionFee', 'VTU admission fee'], ['vtuInsuranceFee', 'VTU blue book & insurance'], ['pdFee', 'PD A/C amount'], ['snqAdjustment', 'SNQ fee reduction']].map(([key, label]) => <div key={key}><label className="text-[10px] text-slate-300 block mb-1 font-semibold">{label} (₹)</label><input type="number" min="0" step="1" readOnly={!editingFee} value={feeBreakdown[key]} onChange={(e) => setFeeBreakdown((prev) => ({ ...prev, [key]: e.target.value }))} className={`w-full px-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-xs text-slate-100 ${!editingFee ? 'opacity-75' : ''}`} /></div>)}
                <div className="text-sm text-slate-200 font-bold">Total: ₹ {Number(feeBreakdown.idpTuitionFee) + Number(feeBreakdown.vtuAdmissionFee) + Number(feeBreakdown.vtuInsuranceFee) + Number(feeBreakdown.pdFee) - Number(feeBreakdown.snqAdjustment)}</div>
                {editingFee && <button type="submit" disabled={savingAnnualFee} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-50">{savingAnnualFee ? 'Saving…' : 'Save fee details'}</button>}
              </div>
            </form>

            {/* 2. Collect fee installment form */}
            {annualLedger.outstandingBalance > 0 && !editingFee && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg print:hidden">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-1.5"><CreditCard size={15} /> Log payment transaction</h3>
                
                <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1 font-semibold">Account *</label>
                    <select
                      value={paymentAccount}
                      onChange={(e) => setPaymentAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none"
                    >
                      {ACCOUNT_OPTIONS.map((option) => (
                        <option key={option.key} value={option.value} className="bg-slate-900 text-slate-100">{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1 font-semibold">Installment Amount (₹) *</label>
                    <input 
                      type="number" 
                      required
                      placeholder={`Max Rs. ${annualLedger.outstandingBalance.toLocaleString('en-IN')}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1 font-semibold">Payment Mode *</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/90 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none"
                    >
                      <option value="UPI" className="bg-slate-900 text-slate-100">UPI / GooglePay / PhonePe</option>
                      <option value="Bank Transfer" className="bg-slate-900 text-slate-100">NEFT / RTGS Transfer</option>
                      <option value="Cash" className="bg-slate-900 text-slate-100">Cash Deposit</option>
                      <option value="Cheque" className="bg-slate-900 text-slate-100">Bank Demand Draft / Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Transaction Ref ID / Bank ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. UPI8839201948"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl text-xs text-slate-250 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Remarks</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Semester 2 fee deposit"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl text-xs text-slate-250 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1 font-semibold">Fee receipt (optional)</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => handleReceiptUpload(e.target.files?.[0])} className="w-full text-[10px] text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100" />
                    <p className="mt-1 text-[9px] text-slate-500">PDF, JPG, or PNG · up to 4.5 MB{receiptUpload ? ` · ${receiptUpload.name} ready` : ''}</p>
                  </div>
                  
                  <div className="sm:col-span-2 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Recording Deposit...' : 'Record Payment Installment'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. Receipt printable view (displays if active) */}
            {activeReceipt && (
              <div className="bg-white text-slate-900 border border-slate-300 p-8 rounded-2xl shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
                <div className="flex justify-between items-center pb-4 border-b border-slate-350">
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wide">GEC Mosalehosahalli</h2>
                    <p className="text-[10px] text-slate-500">Government Engineering College, Mosalehosahalli - Admission fee receipt</p>
                  </div>
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold print:hidden transition-colors"
                  >
                    <Printer size={13} /> Print Receipt
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-450 block font-medium">Student Name</span>
                    <span className="font-bold text-slate-850">{activeReceipt.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-medium">Receipt Code / Date</span>
                    <span className="font-bold text-slate-850">{activeReceipt.receiptNumber} ({new Date(activeReceipt.date).toLocaleDateString()})</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-medium">Admission USN</span>
                    <span className="font-bold text-slate-850">{activeReceipt.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-medium">Qualifying Department</span>
                    <span className="font-bold text-slate-850">{activeReceipt.branch}</span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-300 font-bold text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3">Payment Mode / Reference</th>
                        <th className="p-3 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-3 font-semibold text-slate-800">Tuition & Admission Fees Collection</td>
                        <td className="p-3 text-slate-600">{activeReceipt.account || 'PD A/C'} · {activeReceipt.paymentMode} - {activeReceipt.transactionId || 'N/A'}</td>
                        <td className="p-3 text-right font-bold text-slate-850">₹ {activeReceipt.amount.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold text-[10px] text-slate-650">
                        <td colSpan="2" className="p-3 text-right">Cumulative Collected</td>
                        <td className="p-3 text-right">₹ {displayedCollectedAmount.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold text-slate-850">
                        <td colSpan="2" className="p-3 text-right">Pending Balance Due</td>
                        <td className="p-3 text-right">₹ {annualLedger.outstandingBalance.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-6 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-400">
                  <span>Authorized Signature: GECM Office Desk</span>
                  <span>System Generated. Signature not required.</span>
                </div>
              </div>
            )}

            {/* 4. Transactions Ledger History List */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg print:hidden">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-1.5"><Receipt size={15} /> Payment history ledger</h3>
              
              <div className="space-y-2">
                {historyEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No transaction logs recorded for Year {feeStudyYear}.</p>
                ) : (
                  historyEntries.map((hist, idx) => (
                    <div key={hist.key || hist.receiptNumber || idx} className="flex justify-between items-center text-xs bg-slate-950/20 p-4 border border-slate-800 rounded-xl hover:border-slate-700/50 transition-all duration-200">
                      <div>
                        <span className="font-semibold text-slate-200 block">₹ {Number(hist.amount || 0).toLocaleString('en-IN')}{hist.allocation ? ' · Account allocation' : ` - ${hist.paymentMode}`}</span>
                        {!hist.allocation && <span className="text-[10px] text-slate-450 mt-0.5 block">TxID: {hist.transactionId} | Receipt: {hist.receiptNumber}</span>}
                        <span className="text-[10px] font-semibold text-blue-300">{hist.allocation ? hist.account : `Account: ${hist.account || 'PD A/C'}${hist.studyYear ? ` · Year ${hist.studyYear}` : ''}`}</span>
                        {!hist.allocation && hist.remarks && <span className="text-[10px] text-slate-500 italic block mt-1">"{hist.remarks}"</span>}
                      </div>
                      <div className="text-right">
                        {hist.allocation ? <>
                          <span className="text-[10px] text-slate-450 block">Year {feeStudyYear}</span>
                          <button
                            onClick={() => setActiveReceipt({
                              studentName: selectedStudent.personalDetails.studentName,
                              admissionNumber: selectedStudent.admissionNumber,
                              branch: selectedStudent.academicDetails.branch,
                              amount: hist.amount,
                              date: new Date().toISOString(),
                              transactionId: `ALLOC-${selectedStudent.admissionNumber}-Y${feeStudyYear}-${hist.key.toUpperCase()}`,
                              receiptNumber: `ALLOC-${selectedStudent.admissionNumber}-Y${feeStudyYear}-${hist.key.toUpperCase()}`,
                              paymentMode: 'Annual fee allocation',
                              remarks: `Annual fee allocation for ${hist.account}`,
                              totalPaid: annualLedger.paidAmount,
                              totalDue: annualLedger.outstandingBalance,
                              account: hist.account
                            })}
                            className="mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-semibold hover:underline block"
                          >Generate Receipt</button>
                          {hist.receiptFileName && <button onClick={() => downloadAllocationReceipt(hist.account)} className="mt-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold hover:underline block">Download uploaded receipt</button>}
                          <label className="mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-semibold hover:underline block cursor-pointer">
                            {uploadingAllocationAccount === hist.account ? 'Uploading receipt...' : hist.receiptFileName ? 'Replace receipt' : 'Upload receipt'}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={uploadingAllocationAccount === hist.account} className="sr-only" onChange={(event) => { uploadAllocationReceipt(hist.account, event.target.files?.[0]); event.target.value = ''; }} />
                          </label>
                        </> : <>
                          <span className="text-[10px] text-slate-450 block">{new Date(hist.date).toLocaleDateString()}</span>
                          <button
                            onClick={() => setActiveReceipt({
                              studentName: selectedStudent.personalDetails.studentName,
                              admissionNumber: selectedStudent.admissionNumber,
                              branch: selectedStudent.academicDetails.branch,
                              amount: hist.amount,
                              date: hist.date,
                              transactionId: hist.transactionId,
                              receiptNumber: hist.receiptNumber,
                              paymentMode: hist.paymentMode,
                              remarks: hist.remarks,
                              totalPaid: annualLedger.paidAmount,
                              totalDue: annualLedger.outstandingBalance,
                              account: hist.account || 'PD A/C'
                            })}
                            className="mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-semibold hover:underline block"
                          >Generate Receipt</button>
                          {hist.receiptFileName && <button onClick={() => downloadUploadedReceipt(hist.receiptNumber)} className="mt-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold hover:underline block">Download uploaded receipt</button>}
                          <label className="mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-semibold hover:underline block cursor-pointer">
                            {uploadingReceiptNumber === hist.receiptNumber ? 'Uploading receipt...' : hist.receiptFileName ? 'Replace receipt' : 'Upload receipt'}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={uploadingReceiptNumber === hist.receiptNumber} className="sr-only" onChange={(event) => { uploadReceiptForPayment(hist.receiptNumber, event.target.files?.[0]); event.target.value = ''; }} />
                          </label>
                        </>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2.5xl p-16 text-center text-slate-500 h-[50vh] flex flex-col items-center justify-center gap-3 print:hidden">
            <span className="text-4xl">💰</span>
            <p className="text-sm font-semibold">Select a student profile to manage fee ledgers</p>
            <p className="text-xs text-slate-500 max-w-sm">Manage payment logs, search historical receipts, and generate printable audit records.</p>
          </div>
        )}
      </div>

    </div>
  );
}
