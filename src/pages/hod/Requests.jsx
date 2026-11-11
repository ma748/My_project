import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, FileText, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (error) {
      toast.error('Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Request successfully ${status}`);
      fetchRequests(); // Refresh list
    } catch (error) {
      toast.error(`Failed to ${status.toLowerCase()} request.`);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-[#1e293b]/50 border border-slate-700/50 p-6 rounded-2xl shadow-xl mb-8 flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Pending Requests Management</h2>
          <p className="text-sm text-slate-400">Review and approve or reject student leaves and document requests.</p>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Student Name</th>
                <th className="px-6 py-4 font-medium">USN / ID</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-2 text-emerald-500" size={24} />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <CheckCircle className="mx-auto mb-2 opacity-50 text-emerald-500" size={32} />
                    No requests found. You're all caught up!
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{req.studentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{req.studentId}</span>
                    </td>
                    <td className="px-6 py-4 text-indigo-400 text-sm font-medium">{req.type}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        req.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex justify-center gap-2">
                      {req.status === 'Pending' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(req._id, 'Approved')}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                            title="Reject"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-500 text-sm italic">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
