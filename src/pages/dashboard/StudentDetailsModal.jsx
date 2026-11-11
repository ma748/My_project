import React, { useState } from 'react';
import { X, User, BookOpen, Users, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export default function StudentDetailsModal({ student, onClose, onStatusUpdated, readOnly = false }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(student?.admissionStatus?.year || '1st Year');
  const [currentState, setCurrentState] = useState(student?.admissionStatus?.state || student?.status || 'Active');

  if (!student) return null;

  // Handle both Mongoose document format and legacy mock format
  const isMongoose = !!student.personalDetails;
  
  const personal = isMongoose ? student.personalDetails : {
    studentName: student.name,
    cetNumber: student.id,
    gender: 'N/A',
    dob: 'N/A',
    bloodGroup: 'N/A',
    religion: 'N/A',
    category: 'N/A',
    aadhaarNumber: 'N/A'
  };

  const academic = isMongoose ? student.academicDetails : {
    branch: student.course,
    qualifyingExam: 'N/A',
    board: 'N/A',
    feeCollected: student.feePaid ? 'Paid' : 'Pending',
    allottedCategory: 'N/A'
  };

  const family = isMongoose ? student.familyDetails : {
    fatherName: 'N/A',
    motherName: 'N/A',
    parentContact: 'N/A',
    annualIncome: 'N/A'
  };

  const contact = isMongoose ? student.contactDetails : {
    email: 'N/A',
    studentContact: 'N/A',
    permanentAddress: 'N/A'
  };

  const statusProgression = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Passed Out', 'Dropped'];

  const handleStatusUpdate = async () => {
    if (!student._id) return; // Mongoose ID required
    setIsUpdating(true);
    try {
      await axios.put(`/api/students/${student._id}`, {
        admissionStatus: { year: currentStatus, state: currentState }
      });
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121214] border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              {personal.studentName}
              <span className={`text-xs px-2 py-1 rounded-full border ${currentState === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-red-500/20 text-red-400 border-red-500/20'}`}>
                {currentState}
              </span>
            </h2>
            <p className="text-sm text-gray-400 mt-1">Admission References & Complete Profile</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Status Progression Timeline */}
          <div className="mb-8 border border-white/10 rounded-xl p-5 bg-black/20">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-indigo-400 font-medium flex items-center gap-2">
                  <ShieldCheck size={18} /> Admission Lifecycle Status
                </h3>
                
                {/* Admin Status Update Controls */}
                {!readOnly && isMongoose && (
                  <div className="flex gap-2 items-center">
                    <select 
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-sm rounded px-2 py-1 text-white outline-none"
                    >
                      {statusProgression.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    <select 
                      value={currentState}
                      onChange={(e) => setCurrentState(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-sm rounded px-2 py-1 text-white outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>

                    <button 
                      onClick={handleStatusUpdate}
                      disabled={isUpdating}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : 'Update Status'}
                    </button>
                  </div>
                )}
             </div>

             <div className="relative flex justify-between items-center mt-6 px-4">
                {/* Connecting Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-800 -z-10 rounded"></div>
                
                {statusProgression.map((step, idx) => {
                  const isActive = step === currentStatus;
                  const isPast = statusProgression.indexOf(currentStatus) > idx && currentStatus !== 'Dropped';
                  const isDropped = step === 'Dropped' && currentStatus === 'Dropped';
                  
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                        isPast ? 'bg-emerald-500 border-emerald-500 text-black' : 
                        isActive ? 'bg-indigo-600 border-indigo-400 text-white' : 
                        isDropped ? 'bg-red-600 border-red-400 text-white' :
                        'bg-gray-900 border-gray-700 text-gray-500'
                      }`}>
                        {isPast ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-indigo-300' : 'text-gray-500'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Personal Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-emerald-400 font-medium mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                <User size={18} /> Personal Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Full Name</span> <span className="text-white font-medium">{personal.studentName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">CET/Reference Number</span> <span className="text-white font-medium">{personal.cetNumber}</span></div>
                {isMongoose && <div className="flex justify-between"><span className="text-gray-400">CET Rank</span> <span className="text-white font-medium">{personal.cetRank}</span></div>}
                <div className="flex justify-between"><span className="text-gray-400">Date of Birth</span> <span className="text-white font-medium">{isMongoose ? new Date(personal.dob).toLocaleDateString() : personal.dob}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Gender</span> <span className="text-white font-medium">{personal.gender}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Blood Group</span> <span className="text-rose-400 font-medium">{personal.bloodGroup}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Category</span> <span className="text-white font-medium">{personal.category}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Aadhaar Number</span> <span className="text-white font-medium">{personal.aadhaarNumber}</span></div>
              </div>
            </div>

            {/* Academic Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-blue-400 font-medium mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                <BookOpen size={18} /> Academic Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Admitted Branch</span> <span className="text-white font-medium">{academic.branch}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Allotted Category</span> <span className="text-white font-medium">{academic.allottedCategory}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Qualifying Exam</span> <span className="text-white font-medium">{academic.qualifyingExam}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Board/University</span> <span className="text-white font-medium">{academic.board}</span></div>
                {isMongoose && <div className="flex justify-between"><span className="text-gray-400">State & Region</span> <span className="text-white font-medium">{academic.state}, {academic.region}</span></div>}
                <div className="flex justify-between"><span className="text-gray-400">Fee Collected</span> <span className="text-emerald-400 font-medium">{isMongoose ? `₹${academic.feeCollected}` : academic.feeCollected}</span></div>
                {isMongoose && <div className="flex justify-between"><span className="text-gray-400">Lateral Entry</span> <span className="text-white font-medium">{academic.lateralEntry}</span></div>}
              </div>
            </div>

            {/* Family Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-amber-400 font-medium mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                <Users size={18} /> Family Background
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Father's Name</span> <span className="text-white font-medium">{family.fatherName}</span></div>
                {isMongoose && <div className="flex justify-between"><span className="text-gray-400">Occupation</span> <span className="text-white font-medium">{family.fatherOccupation}</span></div>}
                <div className="flex justify-between mt-2 pt-2 border-t border-white/5"><span className="text-gray-400">Mother's Name</span> <span className="text-white font-medium">{family.motherName}</span></div>
                {isMongoose && <div className="flex justify-between"><span className="text-gray-400">Occupation</span> <span className="text-white font-medium">{family.motherOccupation}</span></div>}
                <div className="flex justify-between mt-2 pt-2 border-t border-white/5"><span className="text-gray-400">Parent Contact</span> <span className="text-white font-medium">{family.parentContact}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Annual Income</span> <span className="text-white font-medium">{isMongoose ? `₹${family.annualIncome}` : family.annualIncome}</span></div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-purple-400 font-medium mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                <Phone size={18} /> Contact & Address
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Email Address</span> <span className="text-white font-medium">{contact.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Student Phone</span> <span className="text-white font-medium">{contact.studentContact}</span></div>
                <div className="mt-3">
                  <span className="text-gray-400 block mb-1">Permanent Address</span>
                  <p className="text-white bg-black/30 p-2 rounded border border-white/5 leading-relaxed">
                    {contact.permanentAddress}
                  </p>
                </div>
                {isMongoose && !contact.sameAsPermanent && (
                  <div className="mt-3">
                    <span className="text-gray-400 block mb-1">Correspondence Address</span>
                    <p className="text-white bg-black/30 p-2 rounded border border-white/5 leading-relaxed">
                      {contact.correspondenceAddress}
                    </p>
                  </div>
                )}
                {isMongoose && contact.sameAsPermanent && (
                  <div className="mt-2 text-xs text-emerald-400/70 italic">* Correspondence same as Permanent address</div>
                )}
              </div>
            </div>

          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-black/40 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium border border-slate-600"
          >
            Close Details
          </button>
        </div>
        
      </div>
    </div>
  );
}
