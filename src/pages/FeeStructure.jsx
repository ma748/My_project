import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Building2, Loader2, Pencil, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { feeDetailsRows } from '../data/feeDetailsRows';

const DEFAULT_SCHEDULE = {
  academicYear: '2026-27',
  rows: feeDetailsRows,
  snqFees: { years2and3: 14560, year4: 14460 },
  accounts: { idp: '110076032635', pd: '1871101011817', vtu: '1871101011816' }
};

const amount = (value) => Number(value || 0).toLocaleString('en-IN');

export default function FeeStructure({ editable = false }) {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [draft, setDraft] = useState(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get('/api/fee-structure', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(({ data }) => {
      if (active && data) {
        const loaded = {
          academicYear: data.academicYear || DEFAULT_SCHEDULE.academicYear,
          rows: Array.isArray(data.rows) && data.rows.length ? data.rows : DEFAULT_SCHEDULE.rows,
          snqFees: { ...DEFAULT_SCHEDULE.snqFees, ...(data.snqFees || {}) },
          accounts: { ...DEFAULT_SCHEDULE.accounts, ...(data.accounts || {}) }
        };
        setSchedule(loaded);
        setDraft(loaded);
      }
    }).catch(() => {
      // Keep the supplied schedule visible if the API is offline.
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateRow = (index, field, value) => setDraft((current) => ({
    ...current,
    rows: current.rows.map((row, rowIndex) => rowIndex === index
      ? { ...row, [field]: value }
      : row)
  }));

  const startEditing = () => {
    setDraft({ ...schedule, rows: schedule.rows.map((row) => ({ ...row })), snqFees: { ...schedule.snqFees }, accounts: { ...schedule.accounts } });
    setIsEditing(true);
  };

  const addRow = () => setDraft((current) => ({
    ...current,
    rows: [...current.rows, { year: '', branch: '', tuition: 0, admission: 0, insurance: 0, pd: 0, total: 0 }]
  }));

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const response = await axios.put('/api/office/fee-structure', draft, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchedule(response.data);
      setDraft(response.data);
      setIsEditing(false);
      toast.success('Fee structure saved and shared with students.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not save fee structure.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-600 bg-slate-950/60 px-2.5 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none';
  const current = isEditing ? draft : schedule;

  return (
    <section className="fee-structure-page mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 text-center shadow-xl">
        <div className="mb-3 flex items-center justify-center gap-2 text-indigo-400">
          <Building2 size={22} />
          <span className="text-sm font-semibold uppercase tracking-[0.18em]">Department of Technical Education</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white md:text-3xl">Government Engineering College, Mosalehosahalli</h1>
        {isEditing ? (
          <label className="mx-auto mt-3 block max-w-xs text-left text-xs font-semibold text-slate-400">Academic year
            <input className={`${inputClass} mt-1 text-center text-lg font-semibold`} value={draft.academicYear} onChange={(event) => setDraft({ ...draft, academicYear: event.target.value })} />
          </label>
        ) : <p className="mt-2 text-lg font-semibold text-slate-200">Fee details for the academic year {current.academicYear}</p>}
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/60 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">Annual tuition and fee schedule</h2>
            <p className="mt-1 text-sm text-slate-400">All amounts are in Indian rupees (Rs.).</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {editable && (isEditing ? <>
              <button type="button" onClick={() => { setDraft(schedule); setIsEditing(false); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-300"><X size={16} /> Cancel</button>
              <button type="button" disabled={saving} onClick={saveSchedule} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save changes</button>
            </> : <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"><Pencil size={16} /> Edit schedule</button>)}
            {!isEditing && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20"><Printer size={17} /> Print schedule</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead><tr className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <th className="px-4 py-4">Sl. No.</th><th className="px-4 py-4">Year / Category</th><th className="px-4 py-4">Branch</th>
              <th className="px-4 py-4 text-right">IDP A/C<br /><span className="font-normal normal-case">Tuition fee</span></th>
              <th className="px-4 py-4 text-right">VTU A/C<br /><span className="font-normal normal-case">Admission fee</span></th>
              <th className="px-4 py-4 text-right">VTU A/C<br /><span className="font-normal normal-case">Blue Book &amp; Student Insurance</span></th>
              <th className="px-4 py-4 text-right">PD A/C<br /><span className="font-normal normal-case">PD amount</span></th><th className="px-4 py-4 text-right">Total</th>
              {isEditing && <th className="px-3 py-4 print:hidden">Remove</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-700/70 text-slate-200">
              {current.rows.map((row, index) => {
                const total = ['tuition', 'admission', 'insurance', 'pd'].reduce((sum, field) => sum + Number(row[field] || 0), 0);
                return <tr key={`${index}-${row.year}-${row.branch}`} className="transition-colors hover:bg-slate-800/40">
                  <td className="px-4 py-4 font-semibold text-slate-400">{index + 1}</td>
                  <td className="px-3 py-3">{isEditing ? <input aria-label={`Year category row ${index + 1}`} className={inputClass} value={row.year} onChange={(event) => updateRow(index, 'year', event.target.value)} /> : <span className="font-semibold text-white">{row.year}</span>}</td>
                  <td className="px-3 py-3">{isEditing ? <input aria-label={`Branch row ${index + 1}`} className={inputClass} value={row.branch} onChange={(event) => updateRow(index, 'branch', event.target.value)} /> : row.branch}</td>
                  {['tuition', 'admission', 'insurance', 'pd'].map((field) => <td key={field} className="px-3 py-3 text-right tabular-nums">{isEditing ? <input aria-label={`${field} amount row ${index + 1}`} type="number" min="0" step="1" className={`${inputClass} min-w-24 text-right`} value={row[field]} onChange={(event) => updateRow(index, field, event.target.value)} /> : amount(row[field])}</td>)}
                  <td className="px-4 py-4 text-right font-bold text-emerald-400 tabular-nums">{amount(total)}</td>
                  {isEditing && <td className="px-3 py-3 print:hidden"><button aria-label={`Remove row ${index + 1}`} type="button" onClick={() => setDraft((value) => ({ ...value, rows: value.rows.filter((_, i) => i !== index) }))} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"><Trash2 size={16} /></button></td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {isEditing && <div className="border-t border-slate-700/70 p-4 print:hidden"><button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 px-3 py-2 text-sm font-semibold text-indigo-300"><Plus size={16} /> Add fee row</button></div>}

        <div className="grid gap-6 border-t border-slate-700/70 p-5 md:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-300">
            <h3 className="font-bold text-white">SNQ student fees</h3>
            <p>2nd and 3rd year: {isEditing ? <input aria-label="2nd and 3rd year SNQ fee" type="number" min="0" className={`${inputClass} mt-1 max-w-48`} value={draft.snqFees.years2and3} onChange={(event) => setDraft({ ...draft, snqFees: { ...draft.snqFees, years2and3: event.target.value } })} /> : <strong className="text-emerald-400">Rs. {amount(current.snqFees.years2and3)}</strong>}</p>
            <p>4th year: {isEditing ? <input aria-label="4th year SNQ fee" type="number" min="0" className={`${inputClass} mt-1 max-w-48`} value={draft.snqFees.year4} onChange={(event) => setDraft({ ...draft, snqFees: { ...draft.snqFees, year4: event.target.value } })} /> : <strong className="text-emerald-400">Rs. {amount(current.snqFees.year4)}</strong>}</p>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <h3 className="font-bold text-white">Bank account numbers</h3>
            {['idp', 'pd', 'vtu'].map((account) => <p key={account}><strong className="uppercase text-slate-100">{account} A/C:</strong> {isEditing ? <input aria-label={`${account} account number`} className={`${inputClass} mt-1 max-w-64 font-mono`} value={draft.accounts[account]} onChange={(event) => setDraft({ ...draft, accounts: { ...draft.accounts, [account]: event.target.value } })} /> : <span className="font-mono">{current.accounts[account]}</span>}</p>)}
          </div>
        </div>
        <p className="border-t border-slate-700/70 px-5 py-3 text-xs text-slate-500">Please confirm payment instructions with the college office before making a transfer.</p>
      </section>
      {loading && <div className="text-center text-sm text-slate-400">Loading saved fee schedule…</div>}
    </section>
  );
}
