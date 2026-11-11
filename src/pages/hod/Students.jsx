import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Loader2, UserX, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentDetailsModal from '../dashboard/StudentDetailsModal';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const userBranch = localStorage.getItem('userBranch') || 'CSE';
  
  // Filter States
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/students', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStudents(res.data);
    } catch (error) {
      toast.error('Failed to load students. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const years = ['All', '1', '2', '3', '4'];

  const filteredStudents = students.filter(student => {
    const sId = student.id || student.studentId || (student._id && student._id.slice(-6).toUpperCase()) || '';
    const sName = student.personalDetails ? student.personalDetails.studentName : (student.name || '');
    const sYear = student.academicDetails?.year || student.year ? (student.academicDetails?.year || student.year).toString() : '1';

    const matchSearch = sName.toLowerCase().includes(search.toLowerCase()) || sId.toLowerCase().includes(search.toLowerCase());
    const matchYear = year === 'All' || sYear === year;
    return matchSearch && matchYear;
  });

  const exportToCSV = () => {
    if (filteredStudents.length === 0) return;
    
    const headers = ['Student ID', 'Full Name', 'Course', 'Current Year', 'Admission Status', 'Email', 'Phone'];
    
    const csvRows = filteredStudents.map(student => {
      const sId = student.id || student.studentId || (student._id && student._id.slice(-6).toUpperCase());
      const sName = student.personalDetails?.studentName || student.name || 'N/A';
      const sCourse = student.academicDetails?.branch || student.course || 'N/A';
      const sYear = student.admissionStatus?.year || (student.year ? `Year ${student.year}` : '1st Year');
      const sStatus = student.admissionStatus?.state || student.status || 'Active';
      const email = student.contactDetails?.email || 'N/A';
      const phone = student.contactDetails?.studentContact || 'N/A';
      
      return [sId, sName, sCourse, sYear, sStatus, email, phone].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${userBranch.toLowerCase()}_department_students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 p-6 rounded-2xl bg-[#1e293b]/60 border border-slate-700/60 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{userBranch} Department</span>
          <h1 className="text-2xl font-bold text-white mt-1">Branch Student Details</h1>
          <p className="text-sm text-slate-400 mt-1">Viewing enrolled student records for the <span className="text-emerald-400 font-medium">{userBranch}</span> department.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider">
          Total Enrolled: {filteredStudents.length}
        </div>
      </div>

      <div className="bg-[#1e293b]/50 border border-slate-700/50 p-6 rounded-2xl shadow-xl mb-8">
        <div className="flex justify-between items-center mb-4 text-emerald-400">
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <h2 className="font-semibold">Search & Filter {userBranch} Students</h2>
          </div>
          <button 
            onClick={exportToCSV}
            disabled={filteredStudents.length === 0}
            className={`px-4 py-1.5 text-sm font-medium border rounded-lg transition-colors ${
              filteredStudents.length === 0 
                ? 'opacity-50 cursor-not-allowed border-slate-600 text-slate-500 bg-slate-800' 
                : 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            Download CSV Export
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by student name or USN / ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2 px-4 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
            >
              {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Academic Years' : `Year ${y}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Student Name</th>
                <th className="px-6 py-4 font-medium">USN / ID</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium text-center">Year</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-2 text-emerald-500" size={24} />
                    Loading records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <UserX className="mx-auto mb-2 opacity-50" size={32} />
                    No students match your requested filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const sId = student.id || (student._id && student._id.slice(-6).toUpperCase());
                  const sName = student.personalDetails ? student.personalDetails.studentName : student.name;
                  const sCourse = student.academicDetails ? student.academicDetails.branch : student.course;
                  const sYear = student.year || '1';
                  const sFee = student.academicDetails ? true : student.feePaid;

                  return (
                  <tr key={student._id || student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{sName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{sId}</span>
                    </td>
                    <td className="px-6 py-4 text-emerald-400/90 text-sm">{sCourse}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-slate-800 px-2 py-1 rounded-full text-xs font-semibold">{sYear}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {sFee ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending Fee
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-700"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          onStatusUpdated={fetchStudents}
        />
      )}
    </div>
  );
}
