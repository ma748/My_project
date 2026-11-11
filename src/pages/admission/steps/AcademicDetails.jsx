import React from 'react';
import { Input } from '../../../components/Input';

export default function AcademicDetails({ data, updateData }) {
  const handleChange = (e) => {
    updateData('academicDetails', e.target.name, e.target.value);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span> 
        Academic & Admission Details
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Qualifying Exam</label>
          <select required name="qualifyingExam" value={data.qualifyingExam} onChange={handleChange} className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors">
            <option value="">Select Exam</option>
            <option value="KCET">KCET</option>
            <option value="COMEDK">COMEDK</option>
            <option value="JEE">JEE Mains</option>
            <option value="Management">Management Quota</option>
            <option value="Diploma">Diploma (Lateral)</option>
          </select>
        </div>

        <Input label="Board (e.g. PU Board/CBSE)" required name="board" value={data.board} onChange={handleChange} placeholder="Board of pre-university education" />
        <Input label="State" required name="state" value={data.state} onChange={handleChange} placeholder="e.g. Karnataka" />
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Region</label>
          <select required name="region" value={data.region} onChange={handleChange} className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors">
            <option value="">Select Region</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Hyd-Karnataka">Hyderabad-Karnataka</option>
            <option value="Non-Karnataka">Non-Karnataka</option>
          </select>
        </div>

        <Input label="Allotted Category (e.g. 3B, GM)" required name="allottedCategory" value={data.allottedCategory} onChange={handleChange} placeholder="Category allotted during counseling" />
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Allotted Branch</label>
          <select required name="branch" value={data.branch} onChange={handleChange} className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors">
            <option value="">Select Branch</option>
            <option value="Computer Science">Computer Science & Engineering</option>
            <option value="Electronics">Electronics & Communication</option>
            <option value="Civil">Civil Engineering</option>
            <option value="Mechanical">Mechanical Engineering</option>
          </select>
        </div>

        <Input label="Fee Collected at KEA (₹)" required name="feeCollected" type="number" value={data.feeCollected} onChange={handleChange} placeholder="Amount paid at KEA" />
        
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-sm font-medium text-gray-300">Lateral Entry?</label>
          <div className="flex gap-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="lateralEntry" value="Yes" checked={data.lateralEntry === 'Yes'} onChange={handleChange} className="accent-blue-500" required /> Yes
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="lateralEntry" value="No" checked={data.lateralEntry === 'No'} onChange={handleChange} className="accent-blue-500" /> No
            </label>
          </div>
        </div>

        {data.lateralEntry === 'Yes' && (
          <Input label="Diploma Total Marks" required name="diplomaMarks" type="number" value={data.diplomaMarks} onChange={handleChange} placeholder="Total marks secured in Diploma" />
        )}

        <Input label="Distance from College (in km)" name="distance" type="number" value={data.distance} onChange={handleChange} placeholder="e.g. 15" />
      </div>
    </div>
  );
}
