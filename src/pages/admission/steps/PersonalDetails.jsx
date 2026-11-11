import React from 'react';
import { Input } from '../../../components/Input';
import { sanitizeCETNumber, sanitizeCETRank } from '../../../utils/cetValidation';

export default function PersonalDetails({ data, studentId, updateData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'cetNumber' ? sanitizeCETNumber(value) : name === 'cetRank' ? sanitizeCETRank(value) : value;
    updateData('personalDetails', name, nextValue);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span> 
        Personal Details
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Student ID / USN" required name="studentId" value={studentId} onChange={(e) => updateData('student', 'studentId', e.target.value.toUpperCase())} placeholder="Enter assigned Student ID / USN" />
        <Input label="CET Number" required name="cetNumber" value={data.cetNumber} onChange={handleChange} placeholder="e.g. AB123" maxLength={5} pattern="[A-Za-z]{2}[0-9]{3}" title="CET Number must be 2 letters followed by 3 digits" />
        <Input label="CET Rank" required name="cetRank" type="number" value={data.cetRank} onChange={handleChange} placeholder="All India / State Rank" min="1" max="1000000" />
        
        <Input label="Student Full Name" required name="studentName" value={data.studentName} onChange={handleChange} placeholder="As per 10th marks card" />
        <Input label="Date of Birth" required type="date" name="dob" value={data.dob} onChange={handleChange} />
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Gender</label>
          <div className="flex gap-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="gender" value="Male" checked={data.gender === 'Male'} onChange={handleChange} className="accent-blue-500" required /> Male
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="gender" value="Female" checked={data.gender === 'Female'} onChange={handleChange} className="accent-blue-500" /> Female
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="gender" value="Other" checked={data.gender === 'Other'} onChange={handleChange} className="accent-blue-500" /> Other
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Blood Group</label>
          <select required name="bloodGroup" value={data.bloodGroup} onChange={handleChange} className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors">
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
          </select>
        </div>

        <Input label="Religion" required name="religion" value={data.religion} onChange={handleChange} placeholder="Religion" />
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Category</label>
          <select required name="category" value={data.category} onChange={handleChange} className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors">
            <option value="">Select Category</option>
            <option value="General">General</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <Input label="Sub-caste" name="subCaste" value={data.subCaste} onChange={handleChange} placeholder="Sub-caste details" />
        
        <Input label="Aadhaar Number" required name="aadhaarNumber" type="text" pattern="\d{12}" maxLength="12" value={data.aadhaarNumber} onChange={handleChange} placeholder="12 Digit Aadhaar Number" title="12 digit number required" />
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Physically Challenged (PH) ?</label>
          <div className="flex gap-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="physicallyChallenged" value="Yes" checked={data.physicallyChallenged === 'Yes'} onChange={handleChange} className="accent-blue-500" required /> Yes
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="physicallyChallenged" value="No" checked={data.physicallyChallenged === 'No'} onChange={handleChange} className="accent-blue-500" /> No
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
