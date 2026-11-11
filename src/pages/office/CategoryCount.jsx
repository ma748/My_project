import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, ClipboardList, Loader2, RefreshCw } from 'lucide-react';

const yearColumns = [
  { key: 1, label: '1st Year' },
  { key: 2, label: '2nd Year' },
  { key: 3, label: '3rd Year' },
  { key: 4, label: '4th Year' }
];

const normalizeBranch = (value) => {
  const branch = String(value || 'Unknown').trim();
  const normalized = branch.toUpperCase();
  if (normalized === 'CSE' || normalized.includes('COMPUTER SCIENCE')) return 'CS';
  if (normalized === 'ECE' || normalized === 'EC' || normalized.includes('ELECTRONICS')) return 'EC';
  if (normalized === 'EEE' || normalized === 'EE' || normalized.includes('ELECTRICAL')) return 'EE';
  if (normalized === 'CIVIL' || normalized === 'CV') return 'CV';
  if (normalized === 'MECHANICAL' || normalized === 'ME') return 'ME';
  if (normalized === 'INFORMATION SCIENCE' || normalized === 'IS') return 'ISE';
  return branch;
};

const emptyYear = () => ({ boys: 0, girls: 0, total: 0 });

const buildCategoryCounts = (students) => {
  const branches = new Map();
  for (const student of students) {
    if (student.approvalStatus !== 'Approved' && student.studentStatus !== 'Active') continue;
    const branch = normalizeBranch(student.academicDetails?.branch || student.branch || student.course);
    const studyYear = Number(student.currentStudyYear || student.academicDetails?.year || student.year || 1);
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 4) continue;

    if (!branches.has(branch)) {
      branches.set(branch, {
        branch,
        years: Object.fromEntries(yearColumns.map(({ key }) => [key, emptyYear()])),
        overall: 0
      });
    }

    const row = branches.get(branch);
    const year = row.years[studyYear];
    const gender = String(student.personalDetails?.gender || student.gender || '').toLowerCase();
    if (gender === 'male' || gender === 'm' || gender === 'boy') year.boys += 1;
    if (gender === 'female' || gender === 'f' || gender === 'girl') year.girls += 1;
    year.total += 1;
    row.overall += 1;
  }

  const rows = [...branches.values()].sort((left, right) => left.branch.localeCompare(right.branch));
  const totals = {
    overall: rows.reduce((sum, row) => sum + row.overall, 0),
    years: Object.fromEntries(yearColumns.map(({ key }) => [key, rows.reduce((sum, row) => {
      const year = row.years[key];
      sum.boys += year.boys;
      sum.girls += year.girls;
      sum.total += year.total;
      return sum;
    }, emptyYear())]))
  };
  return { rows, totals };
};

export default function CategoryCount() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ overall: 0, years: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/office/students', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const counts = buildCategoryCounts(Array.isArray(response.data) ? response.data : []);
      setRows(counts.rows);
      setTotals(counts.totals);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Could not load the current admitted student list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-6 shadow-xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
              <ClipboardList size={20} className="text-blue-400" />
              Category Count
            </h2>
            <p className="mt-1 text-xs text-slate-400">Live branch, year, and gender counts from approved current students.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-300">
              <BarChart3 size={16} />
              {totals.overall} admitted students
            </div>
            <button type="button" onClick={loadStudents} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/55 shadow-xl">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400"><Loader2 size={18} className="animate-spin" /> Loading current students…</div>
        ) : error ? (
          <p role="alert" className="p-8 text-center text-sm text-rose-300">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No approved students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th rowSpan="2" className="border-r border-slate-800 px-5 py-4 align-middle font-bold">Branch</th>
                  {yearColumns.map((year) => <th key={year.key} colSpan="3" className="border-r border-slate-800 px-4 py-3 text-center font-bold text-blue-300">{year.label}</th>)}
                  <th rowSpan="2" className="px-5 py-4 text-right align-middle font-bold text-amber-300">Overall</th>
                </tr>
                <tr className="border-t border-slate-800/80 text-[9px]">
                  {yearColumns.flatMap((year) => [
                    <th key={`${year.key}-boys`} className="px-3 py-2 text-right font-bold">Boys</th>,
                    <th key={`${year.key}-girls`} className="px-3 py-2 text-right font-bold">Girls</th>,
                    <th key={`${year.key}-total`} className="border-r border-slate-800 px-3 py-2 text-right font-bold text-slate-200">Total</th>
                  ])}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {rows.map((row) => (
                  <tr key={row.branch} className="text-slate-300 transition-colors hover:bg-slate-800/30">
                    <td className="border-r border-slate-800 px-5 py-4 font-bold text-slate-100">{row.branch}</td>
                    {yearColumns.flatMap((year) => [
                      <td key={`${row.branch}-${year.key}-boys`} className="px-3 py-4 text-right">{row.years[year.key].boys}</td>,
                      <td key={`${row.branch}-${year.key}-girls`} className="px-3 py-4 text-right">{row.years[year.key].girls}</td>,
                      <td key={`${row.branch}-${year.key}-total`} className="border-r border-slate-800 px-3 py-4 text-right font-semibold text-slate-100">{row.years[year.key].total}</td>
                    ])}
                    <td className="px-5 py-4 text-right font-bold text-amber-300">{row.overall}</td>
                  </tr>
                ))}
                <tr className="bg-blue-500/5 font-bold text-slate-100">
                  <td className="border-r border-slate-800 px-5 py-4">Total</td>
                  {yearColumns.flatMap((year) => [
                    <td key={`total-${year.key}-boys`} className="px-3 py-4 text-right">{totals.years[year.key].boys}</td>,
                    <td key={`total-${year.key}-girls`} className="px-3 py-4 text-right">{totals.years[year.key].girls}</td>,
                    <td key={`total-${year.key}-total`} className="border-r border-slate-800 px-3 py-4 text-right text-blue-300">{totals.years[year.key].total}</td>
                  ])}
                  <td className="px-5 py-4 text-right text-amber-300">{totals.overall}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
