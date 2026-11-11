import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Clock3, Loader2, MessageSquareText, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API = '/api/office/student-edit-requests';

export default function StudentEditRequests() {
  const [requests, setRequests] = useState([]);
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(API, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setRequests(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load student edit requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const updateRequest = async (request, status) => {
    setSavingId(request._id);
    try {
      const response = await axios.put(`${API}/${request._id}`, {
        status,
        officeReply: replies[request._id] || ''
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setRequests((current) => current.map((item) => item._id === request._id ? response.data : item));
      toast.success(`Request ${status.toLowerCase()}.`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update the request.');
    } finally {
      setSavingId(null);
    }
  };

  const labels = {
    studentName: 'Student name', dob: 'Date of birth', gender: 'Gender', category: 'Category',
    cetNumber: 'CET number', branch: 'Branch', qualifyingExam: 'Qualifying exam',
    fatherName: "Father's name", motherName: "Mother's name", annualIncome: 'Annual income',
    email: 'Email', studentContact: 'Phone'
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <MessageSquareText className="text-indigo-500" size={26} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student detail edit requests</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review proposed changes and respond within 24 hours of submission.</p>
          </div>
        </div>
      </header>

      {loading ? <div className="flex justify-center py-16 text-indigo-500"><Loader2 className="animate-spin" /></div> : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No student edit requests yet.</div>
      ) : requests.map((request) => (
        <article key={request._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{request.studentName}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{request.studentId} · {request.branch}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${request.status === 'Pending' ? 'bg-amber-100 text-amber-800' : request.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{request.status}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock3 size={15} /> Submitted {new Date(request.createdAt).toLocaleString()} · Response due {request.officeDueAt ? new Date(request.officeDueAt).toLocaleString() : 'within 24 hours'}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Student message</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{request.reason}</p>
          </div>
          {Object.keys(request.requestedChanges || {}).length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Proposed values</h3>
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(request.requestedChanges).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{labels[key] || key}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-200">{String(value || '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {request.status === 'Pending' ? (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reply to student
                <textarea value={replies[request._id] ?? request.officeReply ?? ''} onChange={(event) => setReplies((current) => ({ ...current, [request._id]: event.target.value }))} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" placeholder="Optional response or next steps" />
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button disabled={savingId === request._id} onClick={() => updateRequest(request, 'Rejected')} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"><X size={16} /> Reject</button>
                <button disabled={savingId === request._id} onClick={() => updateRequest(request, 'Approved')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} /> Approve &amp; apply changes</button>
              </div>
            </div>
          ) : request.officeReply ? <p className="mt-4 text-sm text-slate-600 dark:text-slate-300"><strong>Office reply:</strong> {request.officeReply}</p> : null}
        </article>
      ))}
    </section>
  );
}
