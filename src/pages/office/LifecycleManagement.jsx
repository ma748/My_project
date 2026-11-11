import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard, GraduationCap, Loader2, RefreshCw, Search, X } from 'lucide-react';

const API = '/api/lifecycle';

const getYear = (student) => {
  const batchYear = Number(student.admissionBatch);
  const academicStartYear = Number(String(student.currentAcademicYear || '').match(/^(\d{4})/)?.[1]);
  if (student.admissionType !== 'Lateral Entry' && Number.isInteger(batchYear) && Number.isInteger(academicStartYear)) {
    return Math.min(4, Math.max(1, academicStartYear - batchYear + 1));
  }
  return Number(student.currentStudyYear || student.academicDetails?.year || 1);
};
const getProgression = (student) => {
  const batchYear = Number(student.admissionBatch);
  if (!Number.isInteger(batchYear) || student.admissionType === 'Lateral Entry') return '';
  const currentYear = getYear(student);
  return Array.from({ length: currentYear }, (_, index) => {
    const studyYear = index + 1;
    const start = batchYear + index;
    return `${start}-${String(start + 1).slice(-2)}: Y${studyYear}`;
  }).join(' → ');
};
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

function StatusPill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300'
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function LifecycleManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feeStudent, setFeeStudent] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [savingId, setSavingId] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/students`, { headers: getHeaders(), params: { search: searchQuery } });
      setStudents(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load yearly admission records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const runStudentAction = async (student, action, body = {}) => {
    setSavingId(student._id);
    try {
      await axios.post(`${API}/students/${student._id}/${action}`, body, { headers: getHeaders() });
      toast.success(action.endsWith('recommend') ? 'Promotion sent to the HOD for review.' : 'Yearly record updated.');
      setFeeStudent(null);
      setRemarks('');
      await loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update the student lifecycle.');
    } finally {
      setSavingId('');
    }
  };

  const openFeeVerification = (student) => {
    const fee = student.lifecycle?.fee;
    const paid = fee?.paidAmount ?? student.feeDetails?.paidFee ?? 0;
    setFeeStudent(student);
    setPaidAmount(String(paid));
    setRemarks('');
  };

  const confirmFee = async (event) => {
    event.preventDefault();
    if (!feeStudent || paidAmount === '' || Number(paidAmount) < 0) return;
    await runStudentAction(feeStudent, 'fee-confirmation', { paidAmount: Number(paidAmount), remarks: remarks.trim() });
  };

  return (
    <div className="space-y-6 text-slate-200">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white"><GraduationCap className="text-blue-400" /> Yearly Admission & Fee Records</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">Confirm continuation admission and verify the actual fee payment. Students advance to the next year automatically when the academic year is completed.</p>
          </div>
          <button type="button" onClick={loadStudents} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"><RefreshCw size={15} /> Refresh</button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setSearchQuery(search.trim()); }} className="mt-5 flex max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find by name, student ID, or admission number" className="w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Search</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
        {loading ? <div className="flex items-center justify-center gap-3 p-14 text-blue-300"><Loader2 className="animate-spin" size={22} /> Loading students…</div> : students.length === 0 ? <p className="p-12 text-center text-sm text-slate-400">No approved students found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase tracking-wide text-slate-400">
                <tr><th className="p-4">Student</th><th className="p-4">Academic year</th><th className="p-4">Admission</th><th className="p-4">Fee</th><th className="p-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {students.map((student) => {
                  const year = getYear(student);
                  const admissionConfirmed = student.lifecycle?.admission?.admissionStatus === 'Confirmed';
                  const fee = student.lifecycle?.fee;
                  const feeConfirmed = fee?.feeConfirmationStatus === 'Confirmed';
                  const pending = savingId === student._id;
                  return (
                    <tr key={student._id}>
                      <td className="p-4"><div className="font-semibold text-white">{student.personalDetails?.studentName || 'Student'}</div><div className="mt-0.5 text-xs text-slate-400">{student.studentId || student.admissionNumber} · {student.academicDetails?.branch || 'Branch not set'}</div></td>
                      <td className="p-4"><div>Year {year}</div><div className="text-xs text-slate-500">{student.currentAcademicYear || 'Academic year not set'}</div>{getProgression(student) && <div className="mt-1 max-w-[360px] text-[10px] leading-relaxed text-slate-500">{getProgression(student)}</div>}</td>
                      <td className="p-4"><StatusPill tone={admissionConfirmed ? 'green' : 'amber'}>{admissionConfirmed ? 'Confirmed' : 'Pending'}</StatusPill></td>
                      <td className="p-4"><StatusPill tone={feeConfirmed ? 'green' : 'amber'}>{fee?.feeConfirmationStatus || 'Pending'}</StatusPill>{fee && <div className="mt-1 text-[11px] text-slate-500">Due ₹{Number(fee.outstandingBalance || 0).toLocaleString('en-IN')}</div>}</td>
                      <td className="p-4"><div className="flex flex-wrap gap-2">
                        <button type="button" disabled={pending || admissionConfirmed || year > 4} onClick={() => runStudentAction(student, 'admission-confirmation')} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{admissionConfirmed ? 'Admission confirmed' : 'Confirm admission'}</button>
                        <button type="button" disabled={pending || feeConfirmed || year > 4} onClick={() => openFeeVerification(student)} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"><CreditCard size={13} /> Verify fee</button>
                        {pending && <Loader2 className="my-auto animate-spin text-blue-300" size={16} />}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {feeStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-labelledby="fee-verification-title">
          <form onSubmit={confirmFee} className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h3 id="fee-verification-title" className="text-lg font-bold text-white">Verify yearly fee</h3><p className="mt-1 text-sm text-slate-400">{feeStudent.personalDetails?.studentName} · Year {getYear(feeStudent)} · {feeStudent.currentAcademicYear}</p></div><button type="button" onClick={() => setFeeStudent(null)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={19} /></button></div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center text-xs">
              <div><div className="text-slate-500">Annual fee</div><div className="mt-1 font-semibold text-slate-200">₹{Number(feeStudent.lifecycle?.fee?.totalFee ?? feeStudent.feeDetails?.totalFee ?? 0).toLocaleString('en-IN')}</div></div>
              <div><div className="text-slate-500">Recorded paid</div><div className="mt-1 font-semibold text-emerald-300">₹{Number(feeStudent.lifecycle?.fee?.paidAmount ?? feeStudent.feeDetails?.paidFee ?? 0).toLocaleString('en-IN')}</div></div>
              <div><div className="text-slate-500">Balance due</div><div className="mt-1 font-semibold text-amber-300">₹{Number(feeStudent.lifecycle?.fee?.outstandingBalance ?? feeStudent.feeDetails?.pendingFee ?? 0).toLocaleString('en-IN')}</div></div>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-300">Total amount actually paid (₹)<input autoFocus type="number" min="0" step="0.01" required value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-white outline-none focus:border-blue-500" /></label>
            <label className="mt-4 block text-sm font-medium text-slate-300">Receipt / verification note (optional)<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-white outline-none focus:border-blue-500" /></label>
            <p className="mt-3 text-xs text-slate-500">Enter the amount verified from the official receipt. Promotion becomes available only when the full yearly fee is confirmed.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setFeeStudent(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Cancel</button><button disabled={Boolean(savingId)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><CheckCircle2 size={15} /> Save verification</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
