import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart2, Calendar, FileText, Download, Printer } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('department'); // 'department' | 'daily' | 'feeLog'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/reports/data', {
        headers: { Authorization: `Bearer ${token}` },
        params: { reportType }
      });
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load report dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (reportType === 'department') {
      csvContent += 'Department,Students Count,Fees Collected (INR),Fees Pending (INR)\n';
      data.forEach(row => {
        csvContent += `${row._id || 'Unknown'},${row.studentCount},${row.feesCollected},${row.feesPending}\n`;
      });
    } else if (reportType === 'daily') {
      csvContent += 'Date,Admissions Count,Fees Collected (INR)\n';
      data.forEach(row => {
        csvContent += `${row._id},${row.admissionsCount},${row.feesCollected}\n`;
      });
    } else if (reportType === 'feeLog') {
      csvContent += 'Student Name,Admission Code,Amount Paid (INR),Transaction Date,Transaction ID,Receipt Number,Mode,Remarks\n';
      data.forEach(row => {
        const cleanName = row.studentName.replace(/,/g, '');
        const cleanRemarks = (row.remarks || '').replace(/,/g, '');
        csvContent += `${cleanName},${row.admissionNumber || 'N/A'},${row.amount},${new Date(row.date).toLocaleDateString()},${row.transactionId},${row.receiptNumber},${row.paymentMode},${cleanRemarks}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gecm_report_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report successfully exported to CSV!');
  };

  return (
    <div className="space-y-6 print:p-0">
      
      {/* Selection Tabs & Exporters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-md print:hidden">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setReportType('department')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
              reportType === 'department' 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 size={14} /> Department Wise
          </button>
          <button
            onClick={() => setReportType('daily')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
              reportType === 'daily' 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={14} /> Daily Enrollments
          </button>
          <button
            onClick={() => setReportType('feeLog')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
              reportType === 'feeLog' 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={14} /> Fee logs
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-750"
          >
            <Download size={14} /> Export CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-550 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 transition-all"
          >
            <Printer size={14} /> Print Audit
          </button>
        </div>
      </div>

      {/* Report Data display Grid */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg">
        <div className="pb-4 border-b border-slate-800 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
              {reportType === 'department' ? 'Department-wise Aggregated Audits' :
               reportType === 'daily' ? '30-Day Admissions enrollment frequency' : 'Consolidated Fee Payment Transactions Log'}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Report database generated on {new Date().toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="h-6 w-6 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            <span className="text-xs">Generating report dataset...</span>
          </div>
        ) : data.length === 0 ? (
          <p className="text-center py-16 text-slate-500 text-xs">No records found for current parameter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {reportType === 'department' && (
                <>
                  <thead className="bg-slate-950/40 font-bold uppercase tracking-wider text-slate-450 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Department Branch</th>
                      <th className="p-3">Students Registered</th>
                      <th className="p-3">Total Fees Collected</th>
                      <th className="p-3">Pending Dues Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {data.map(row => (
                      <tr key={row._id} className="hover:bg-slate-850/20">
                        <td className="p-3 font-semibold text-slate-200">{row._id || 'General Allocation'}</td>
                        <td className="p-3">{row.studentCount}</td>
                        <td className="p-3 font-semibold text-emerald-400">₹ {row.feesCollected.toLocaleString('en-IN')}</td>
                        <td className="p-3 font-semibold text-amber-500">₹ {row.feesPending.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {reportType === 'daily' && (
                <>
                  <thead className="bg-slate-950/40 font-bold uppercase tracking-wider text-slate-450 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Admission Registration Date</th>
                      <th className="p-3">Enrolled Profiles Count</th>
                      <th className="p-3">Deposit Fees Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {data.map(row => (
                      <tr key={row._id} className="hover:bg-slate-850/20">
                        <td className="p-3 font-semibold text-slate-200">{new Date(row._id).toLocaleDateString()}</td>
                        <td className="p-3">{row.admissionsCount} students</td>
                        <td className="p-3 font-semibold text-emerald-450">₹ {row.feesCollected.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {reportType === 'feeLog' && (
                <>
                  <thead className="bg-slate-950/40 font-bold uppercase tracking-wider text-slate-450 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Receipt Code</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Transaction Date</th>
                      <th className="p-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {data.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-850/20">
                        <td className="p-3">
                          <span className="font-semibold text-slate-200 block">{row.studentName}</span>
                          <span className="text-[10px] text-slate-500 italic block">"{row.remarks || 'Regular payment'}"</span>
                        </td>
                        <td className="p-3 text-slate-400 font-semibold">{row.admissionNumber || 'N/A'}</td>
                        <td className="p-3">
                          <span className="block font-medium">{row.receiptNumber}</span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Ref: {row.transactionId}</span>
                        </td>
                        <td className="p-3">{row.paymentMode}</td>
                        <td className="p-3">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-bold text-slate-200">₹ {row.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
