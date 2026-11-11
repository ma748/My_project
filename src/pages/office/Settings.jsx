import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Settings, Database, Save, Upload, Download, Trash, Plus } from 'lucide-react';

export default function SettingsHub() {
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Input states for adding tags
  const [newDept, setNewDept] = useState('');
  const [newCourse, setNewCourse] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/office/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(res.data.departments || []);
      setCourses(res.data.courses || []);
      setAcademicYear(res.data.academicYear || '');
    } catch (err) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/office/settings', {
        departments,
        courses,
        academicYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('System settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDept = (e) => {
    e.preventDefault();
    if (newDept.trim() && !departments.includes(newDept.trim())) {
      setDepartments(prev => [...prev, newDept.trim().toUpperCase()]);
      setNewDept('');
    }
  };

  const handleRemoveDept = (dept) => {
    setDepartments(prev => prev.filter(d => d !== dept));
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (newCourse.trim() && !courses.includes(newCourse.trim())) {
      setCourses(prev => [...prev, newCourse.trim()]);
      setNewCourse('');
    }
  };

  const handleRemoveCourse = (course) => {
    setCourses(prev => prev.filter(c => c !== course));
  };

  // Database Backup download
  const handleBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/office/backup', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Download file wrapper
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gecm_db_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Database backup JSON file generated & downloaded!');
    } catch (err) {
      toast.error('Failed to generate database backup');
    }
  };

  // Database Restore upload handler
  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring the database will overwrite all existing student accounts, settings, and face biometrics. Do you want to proceed?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target.result);
        const token = localStorage.getItem('token');
        
        await axios.post('/api/office/restore', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Database successfully restored! Reloading configurations...');
        fetchSettings();
      } catch (err) {
        toast.error('Restore failed: ' + (err.response?.data?.error || 'Invalid file format'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left panel Settings configurations */}
      <div className="lg:col-span-2 space-y-6">
        
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg">
          <div className="pb-4 border-b border-slate-800 mb-5 flex items-center gap-2">
            <Settings size={18} className="text-blue-500" />
            <h2 className="text-base font-bold text-slate-100">System Configurations</h2>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center animate-pulse">Loading configurations...</p>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Academic Year */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Active Academic Year</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 2026-2027"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* Departments tag management */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Manage Active Departments / Branches</label>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add Department Code (e.g. AIML)"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                  <button 
                    onClick={handleAddDept}
                    className="p-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-slate-200 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {departments.map(dept => (
                    <span 
                      key={dept} 
                      className="px-2.5 py-1 bg-slate-950/40 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      {dept}
                      <button type="button" onClick={() => handleRemoveDept(dept)} className="text-slate-500 hover:text-rose-400"><Trash size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Courses tag management */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Manage Academic Programs / Courses</label>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add Course Program (e.g. MBA)"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                  <button 
                    onClick={handleAddCourse}
                    className="p-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-slate-200 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {courses.map(course => (
                    <span 
                      key={course} 
                      className="px-2.5 py-1 bg-slate-950/40 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      {course}
                      <button type="button" onClick={() => handleRemoveCourse(course)} className="text-slate-500 hover:text-rose-400"><Trash size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  <Save size={14} /> {saving ? 'Saving System configurations...' : 'Save Configuration Changes'}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>

      {/* Right panel Backup / Restore utils */}
      <div className="space-y-6">
        
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg text-center space-y-4">
          <div className="h-10 w-10 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Database backup utility</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Download the entire MongoDB collection dataset as a structured JSON file for local archives.
            </p>
          </div>
          <button
            onClick={handleBackup}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            <Download size={14} /> Generate DB Backup
          </button>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2.5xl p-6 shadow-lg text-center space-y-4">
          <div className="h-10 w-10 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Database Restore utility</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Warning: Restoring will format and replace all active student profiles, credentials, and settings.
            </p>
          </div>
          
          <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md shadow-amber-600/10">
            <Upload size={14} /> Upload Backup JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={handleRestore}
              className="hidden" 
            />
          </label>
        </div>

      </div>

    </div>
  );
}
