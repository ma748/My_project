import React, { useEffect } from 'react';
import { Input } from '../../../components/Input';

export default function ContactDetails({ data, updateData }) {
  const handleChange = (e) => {
    updateData('contactDetails', e.target.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  };

  // Sync correspondence address if 'sameAsPermanent' is checked
  useEffect(() => {
    if (data.sameAsPermanent) {
      updateData('contactDetails', 'correspondenceAddress', data.permanentAddress);
    }
  }, [data.permanentAddress, data.sameAsPermanent]);

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <span className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span> 
        Contact & Quota Details
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Input 
          label="Student Contact Number" 
          required 
          name="studentContact" 
          type="tel" 
          pattern="[0-9]{10}"
          maxLength="10"
          value={data.studentContact} 
          onChange={handleChange} 
          placeholder="10 digit mobile number" 
        />
        
        <Input 
          label="Email Address" 
          required 
          name="email" 
          type="email" 
          value={data.email} 
          onChange={handleChange} 
          placeholder="student@example.com" 
        />
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Permanent Address *</label>
          <textarea 
            required
            name="permanentAddress" 
            value={data.permanentAddress} 
            onChange={handleChange}
            placeholder="Enter full permanent address"
            className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-y"
          ></textarea>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-gray-300">Correspondence Address *</label>
            <label className="flex items-center gap-2 text-xs text-blue-400 cursor-pointer">
              <input 
                type="checkbox" 
                name="sameAsPermanent" 
                checked={data.sameAsPermanent} 
                onChange={handleChange} 
                className="accent-blue-500 rounded"
              />
              Same as Permanent
            </label>
          </div>
          <textarea 
            required
            name="correspondenceAddress" 
            value={data.correspondenceAddress} 
            onChange={handleChange}
            placeholder="Enter full correspondence address"
            className="w-full p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-y"
            disabled={data.sameAsPermanent}
            style={{ opacity: data.sameAsPermanent ? 0.6 : 1 }}
          ></textarea>
        </div>

        <div className="md:col-span-2 mt-4 p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
          <h3 className="text-md font-medium text-gray-200 mb-4">Special Quotas (Select Yes if applicable)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-sm text-gray-300">Defence Quota</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1 cursor-pointer text-sm"><input type="radio" name="defenceQuota" value="Yes" checked={data.defenceQuota === 'Yes'} onChange={handleChange} className="accent-blue-500"/> Yes</label>
                <label className="flex items-center gap-1 cursor-pointer text-sm"><input type="radio" name="defenceQuota" value="No" checked={data.defenceQuota === 'No'} onChange={handleChange} className="accent-blue-500"/> No</label>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-sm text-gray-300">Sports Quota</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1 cursor-pointer text-sm"><input type="radio" name="sportsQuota" value="Yes" checked={data.sportsQuota === 'Yes'} onChange={handleChange} className="accent-blue-500"/> Yes</label>
                <label className="flex items-center gap-1 cursor-pointer text-sm"><input type="radio" name="sportsQuota" value="No" checked={data.sportsQuota === 'No'} onChange={handleChange} className="accent-blue-500"/> No</label>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-sm text-gray-300">SNQ Quota</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1 cursor-pointer text-sm"><input type="radio" name="snqQuota" value="Yes" checked={data.snqQuota === 'Yes'} onChange={handleChange} className="accent-blue-500"/> Yes</label>
                <label className="flex items-center gap-1 cursor-pointer text-sm"><input type="radio" name="snqQuota" value="No" checked={data.snqQuota === 'No'} onChange={handleChange} className="accent-blue-500"/> No</label>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
