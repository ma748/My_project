import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bell, Search, Mail, Send, CheckSquare, RefreshCw } from 'lucide-react';

export default function Notifications() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Notification fields
  const [notificationType, setNotificationType] = useState('Fee Dues Reminder');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Notifications only for approved/active students
      setStudents(res.data.filter(s => s.approvalStatus === 'Approved'));
    } catch (err) {
      toast.error('Failed to load student directory list');
    }
  };

  // Auto-compose message templates
  useEffect(() => {
    if (!selectedStudent) {
      setCustomMessage('');
      return;
    }
    const name = selectedStudent.personalDetails.studentName;
    const dueAmt = selectedStudent.feeDetails?.pendingFee || 0;
    
    if (notificationType === 'Fee Dues Reminder') {
      setCustomMessage(`Dear ${name},\n\nOur database records indicate an outstanding balance of ₹ ${dueAmt.toLocaleString('en-IN')} for your annual college tuition fees. Please deposit this balance at the administrative office or verify transaction reference keys in the student portal immediately to prevent enrollment holds.`);
    } else if (notificationType === 'Missing Aadhaar Documents') {
      setCustomMessage(`Dear ${name},\n\nYour GECM student profile documentation is incomplete. Please upload high-resolution scan attachments of your Aadhaar card via the student dashboard, or hand over photocopy credentials to the office desk.`);
    } else if (notificationType === 'Biometrics Registration Required') {
      setCustomMessage(`Dear ${name},\n\nYour biometric facial recognition signature key has not been registered in the college identity database. Please visit the administration office block to record face camera photographs.`);
    } else if (notificationType === 'Orientation Schedule Alert') {
      setCustomMessage(`Dear ${name},\n\nWelcome to GECM! The mandatory first-year student orientation seminar is scheduled for Monday at 9:30 AM in the Main Seminar Hall. Attendance is mandatory. Please bring your original fee receipt.`);
    }
  }, [notificationType, selectedStudent]);

  const handleSendMail = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a recipient student.');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/office/notifications/reminder', {
        email: selectedStudent.contactDetails.email,
        studentName: selectedStudent.personalDetails.studentName,
        type: notificationType,
        message: customMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Alert reminder email dispatched successfully!');
      setCustomMessage('');
      setSelectedStudent(null);
    } catch (err) {
      toast.error('Mail dispatch failed. Verify mail server settings.');
    } finally {
      setSending(false);
    }
  };

  const handleSendAllDues = async () => {
    const dueStudents = students.filter(s => s.feeDetails?.pendingFee > 0);
    if (dueStudents.length === 0) {
      toast.error('No students with active pending dues found');
      return;
    }

    if (!window.confirm(`Are you sure you want to broadcast automated fee reminders to all ${dueStudents.length} students with outstanding balances?`)) {
      return;
    }

    setSending(true);
    let successCount = 0;
    const token = localStorage.getItem('token');
    
    for (const stud of dueStudents) {
      try {
        const msg = `Dear ${stud.personalDetails.studentName},\n\nOur database records indicate an outstanding balance of ₹ ${(stud.feeDetails?.pendingFee || 0).toLocaleString('en-IN')} for your annual college tuition fees. Please deposit this balance at the administrative office immediately.`;
        await axios.post('/api/office/notifications/reminder', {
          email: stud.contactDetails.email,
          studentName: stud.personalDetails.studentName,
          type: 'Fee Dues Reminder',
          message: msg
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to send alert to ${stud.contactDetails.email}`);
      }
    }

    toast.success(`Broadcasted fee reminders to ${successCount} students successfully!`);
    setSending(false);
  };

  const filteredStudents = students.filter(s => 
    s.personalDetails.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.personalDetails.cetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Sidebar student finder */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-5 shadow-lg flex flex-col h-[75vh]">
          
          <div className="pb-3 border-b border-slate-800 mb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Send Notification</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Select a recipient student</p>
            </div>
            
            <button
              onClick={handleSendAllDues}
              disabled={sending}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold rounded-lg text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Alert All Dues
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-2 text-slate-450" size={14} />
            <input 
              type="text" 
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No active students found</p>
            ) : (
              filteredStudents.map(stud => {
                const isSel = selectedStudent?._id === stud._id;
                const hasDue = stud.feeDetails?.pendingFee > 0;
                return (
                  <button
                    key={stud._id}
                    onClick={() => setSelectedStudent(stud)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      isSel ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-950/20 border-slate-850 hover:bg-slate-900/30'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block truncate max-w-[150px]">{stud.personalDetails.studentName}</span>
                      <span className="text-[9px] text-slate-450">{stud.contactDetails.email}</span>
                    </div>
                    {hasDue && (
                      <span className="text-[8px] bg-amber-500/10 text-amber-550 border border-amber-500/20 px-2 py-0.5 rounded font-bold">DUE</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Main Mail form */}
      <div className="lg:col-span-8">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg h-full flex flex-col justify-between">
          
          <div>
            <div className="pb-4 border-b border-slate-800 mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2"><Mail size={18} className="text-blue-500" /> Dispatch Mail Console</h2>
              <span className="text-xs text-slate-400">SMTP Server Status: <span className="text-emerald-400 font-bold">Online</span></span>
            </div>

            {selectedStudent ? (
              <form onSubmit={handleSendMail} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Recipient Student Name</label>
                    <input 
                      type="text" 
                      disabled
                      value={selectedStudent.personalDetails.studentName}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Destination Address Email</label>
                    <input 
                      type="text" 
                      disabled
                      value={selectedStudent.contactDetails.email}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Composition Template Alert *</label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Fee Dues Reminder">Fee Dues Reminder Alert</option>
                    <option value="Missing Aadhaar Documents">Missing Aadhaar Documents Alert</option>
                    <option value="Biometrics Registration Required">Biometrics Registration Required Alert</option>
                    <option value="Orientation Schedule Alert">Orientation Schedule Alert</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Custom Message Body Composition *</label>
                  <textarea
                    required
                    rows={8}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                  >
                    <Send size={14} /> {sending ? 'Dispatching Mail...' : 'Send Reminder Alert'}
                  </button>
                </div>

              </form>
            ) : (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">📬</span>
                <p className="text-xs font-semibold">Select a recipient student to compose a notification mail</p>
                <p className="text-[10px] text-slate-500 max-w-xs">Composition templates automatically pull outstanding balances and names dynamically.</p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
