import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Send,
  Users,
  XCircle
} from 'lucide-react';

export default function LifecycleReviewPanel({ role = 'hod', title = 'Lifecycle Review' }) {
  const [overview, setOverview] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }), []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, promotionsRes] = await Promise.all([
        axios.get('/api/lifecycle/overview', { headers }),
        axios.get(`/api/lifecycle/promotions/pending?stage=${role === 'principal' ? 'principal' : 'hod'}`, { headers })
      ]);
      setOverview(overviewRes.data);
      setPromotions(promotionsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load lifecycle review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [headers]);

  const handleDecision = async (id, action) => {
    setProcessingId(id);
    try {
      const endpoint = role === 'principal'
        ? `/api/lifecycle/promotions/${id}/principal-approve`
        : `/api/lifecycle/promotions/${id}/hod-approve`;
      await axios.post(`${endpoint}`, { action }, { headers });
      toast.success(action === 'Approve' ? 'Decision recorded' : 'Decision recorded');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Decision failed');
    } finally {
      setProcessingId(null);
    }
  };

  const cards = [
    { label: 'Total Students', value: overview?.totalStudents || 0, icon: Users, tone: 'text-blue-400' },
    { label: 'Pending Admissions', value: overview?.pendingAdmissionConfirmations || 0, icon: BookOpenCheck, tone: 'text-amber-400' },
    { label: 'Pending Fees', value: overview?.pendingFeeConfirmations || 0, icon: CreditCard, tone: 'text-orange-400' },
    { label: 'Ready for Promotion', value: overview?.studentsReadyForPromotion || 0, icon: Send, tone: 'text-emerald-400' }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-400 mt-1">
              Monitor yearly admission confirmations, fee status, and promotion approvals for the engineering lifecycle.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                <Icon size={18} className={card.tone} />
              </div>
              <div className={`mt-3 text-2xl font-extrabold ${card.tone}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/35 shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-blue-400">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm font-semibold">Loading lifecycle queue...</span>
          </div>
        ) : promotions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No pending lifecycle approvals at the moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Current Year</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {promotions.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-900/40">
                    <td className="p-4">
                      <div className="font-semibold text-slate-100">{item.student?.personalDetails?.studentName || 'Student'}</div>
                      <div className="text-[11px] text-blue-400">{item.student?.studentId || '-'}</div>
                    </td>
                    <td className="p-4 text-slate-300">{item.student?.academicDetails?.branch || '-'}</td>
                    <td className="p-4 text-slate-300">Year {item.student?.currentStudyYear || item.student?.academicDetails?.year || 1}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDecision(item._id, 'Approve')}
                          disabled={processingId === item._id}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400"
                        >
                          {processingId === item._id ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={14} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(item._id, 'Reject')}
                          disabled={processingId === item._id}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400"
                        >
                          {processingId === item._id ? <Loader2 className="animate-spin" size={12} /> : <XCircle size={14} />}
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
