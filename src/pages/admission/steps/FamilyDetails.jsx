import React from 'react';
import { Input } from '../../../components/Input';

export default function FamilyDetails({ data, updateData }) {
  const handleChange = (e) => {
    updateData('familyDetails', e.target.name, e.target.value);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span> 
        Family Details
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Father's Name" required name="fatherName" value={data.fatherName} onChange={handleChange} placeholder="As per records" />
        <Input label="Mother's Name" required name="motherName" value={data.motherName} onChange={handleChange} placeholder="As per records" />
        
        <Input 
          label="Parent Contact Number" 
          required 
          name="parentContact" 
          type="tel" 
          pattern="[0-9]{10}"
          maxLength="10"
          value={data.parentContact} 
          onChange={handleChange} 
          placeholder="10 digit mobile number" 
          title="10 digit phone number required"
        />
        
        <Input label="Father's Occupation" required name="fatherOccupation" value={data.fatherOccupation} onChange={handleChange} placeholder="e.g. Farmer, Govt Employee" />
        <Input label="Mother's Occupation" required name="motherOccupation" value={data.motherOccupation} onChange={handleChange} placeholder="e.g. Housewife, Teacher" />
        
        <div className="flex flex-col gap-2 mb-5 md:col-span-2 max-w-md">
          <label className="text-sm font-medium text-gray-300">Total Annual Income</label>
          <div className="relative">
            <span className="absolute left-3 top-3.5 text-gray-400">₹</span>
            <input 
              required 
              name="annualIncome" 
              type="number" 
              value={data.annualIncome} 
              onChange={handleChange} 
              placeholder="e.g. 250000" 
              className="w-full p-3 pl-8 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
