import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Landmark, BookOpen, Building2, GraduationCap, Lock, KeyRound, ShieldAlert } from 'lucide-react';

const roleConfig = {
  principal: {
    title: 'Principal Login',
    subtitle: 'Institutional Governance Node',
    desc: 'Access institutional analytics and high-level controls',
    icon: Landmark,
    color: '#f59e0b',
    borderGlow: 'hover:border-amber-500/40',
    accentText: 'text-amber-400',
    badge: 'EXEC-01'
  },
  hod: {
    title: 'HOD Login',
    subtitle: 'Department Operations Node',
    desc: 'Manage departmental affairs and student metrics',
    icon: BookOpen,
    color: '#10b981',
    borderGlow: 'hover:border-emerald-500/40',
    accentText: 'text-emerald-400',
    badge: 'DEPT-02'
  },
  office: {
    title: 'Office Login',
    subtitle: 'Campus Administration Node',
    desc: 'Handle fee collections and admissions portal',
    icon: Building2,
    color: '#3b82f6',
    borderGlow: 'hover:border-blue-500/40',
    accentText: 'text-blue-400',
    badge: 'ADM-03'
  },
  student: {
    title: 'Student Login',
    subtitle: 'Academic Portfolio Node',
    desc: 'Access your academic records and fee receipts',
    icon: GraduationCap,
    color: '#6366f1',
    borderGlow: 'hover:border-indigo-500/40',
    accentText: 'text-indigo-400',
    badge: 'STD-04'
  }
};

export function LoginModule() {
  const { role } = useParams();
  const navigate = useNavigate();

  // Map URL param to actual role values
  const getInitialRole = (r) => {
    if (r === 'hod') return 'HOD';
    if (r === 'office') return 'Staff';
    if (r === 'principal') return 'Principal';
    return 'student'; // Fallback
  };

  const selectedRole = getInitialRole(role);
  const [branch, setBranch] = useState('CSE');
  const [loading, setLoading] = useState(false);

  const configKey = selectedRole.toLowerCase() === 'staff' ? 'office' : selectedRole.toLowerCase();
  const config = roleConfig[configKey] || roleConfig.student;
  const RoleIcon = config.icon;
  const rememberedUserIdKey = `rememberedUserId:${configKey}`;
  const [userId, setUserId] = useState(() => localStorage.getItem(rememberedUserIdKey) || '');
  const [rememberUserId, setRememberUserId] = useState(() => Boolean(localStorage.getItem(rememberedUserIdKey)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const password = e.target.elements.password.value;
    
    if (!userId || !password) {
      return toast.error('All fields are required');
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        email: userId,
        password,
        role: selectedRole,
        branch: selectedRole === 'HOD' ? branch : undefined
      });

      if (rememberUserId) localStorage.setItem(rememberedUserIdKey, userId.trim());
      else localStorage.removeItem(rememberedUserIdKey);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user?.userId || userId);
      localStorage.setItem('userRole', selectedRole);
      if (res.data.user?.id) {
        localStorage.setItem('userId', res.data.user.id);
      }
      if (res.data.user?.email) {
        localStorage.setItem('userEmail', res.data.user.email);
      }
      if (res.data.user?.branch) {
        localStorage.setItem('userBranch', res.data.user.branch);
      }
      
      toast.success('Login Successful!');
      
      setTimeout(() => {
        if (selectedRole === 'Principal') {
          navigate('/dashboard/principal');
        } else if (selectedRole === 'HOD') {
          navigate('/dashboard/hod');
        } else if (selectedRole === 'Staff') {
          navigate('/dashboard/office');  
        } else if (selectedRole === 'student') {
          navigate('/dashboard/student');
        } else {
          toast.success(`Logged in successfully!`);
        }
      }, 700);
      
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials or connection error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between selection:bg-blue-500/30 selection:text-white">
      {/* Top Bar with Back Link & Theme Toggle */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Back to Roles</span>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Login Form Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10 z-10">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          <Card className={`relative overflow-hidden specular-border-top border border-white/10 ${config.borderGlow} p-5 sm:p-8 backdrop-blur-2xl`}>
            
            {/* Header info */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="nothing-pill text-[9px] font-mono text-slate-400">
                  {config.badge} // AUTH
                </span>
              </div>

              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl mx-auto flex items-center justify-center bg-white/5 border border-white/10 mb-3 sm:mb-4 shadow-inner">
                <RoleIcon size={24} style={{ color: config.color }} />
              </div>

              <h2 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight">
                {config.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {config.desc}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {selectedRole === 'HOD' && (
                <div className="flex flex-col gap-1.5 mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-300">Academic Department</label>
                  <select 
                    value={branch} 
                    onChange={(e) => setBranch(e.target.value)} 
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-slate-900/60 dark:bg-slate-950/60 border border-slate-700/70 dark:border-white/10 text-slate-100 text-sm sm:text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all"
                  >
                    <option value="CSE" className="bg-slate-900 text-white">Computer Science & Engineering (CSE)</option>
                    <option value="ECE" className="bg-slate-900 text-white">Electronics & Communication (ECE)</option>
                    <option value="ME" className="bg-slate-900 text-white">Mechanical Engineering (ME)</option>
                    <option value="Civil" className="bg-slate-900 text-white">Civil Engineering</option>
                  </select>
                </div>
              )}

              <Input 
                label={selectedRole === 'student' ? 'Student ID or USN' : `${selectedRole} User ID`} 
                id="userId" 
                type="text"
                placeholder={selectedRole === 'student' ? 'e.g. 4HG23CS001 or 2026CS001' : `e.g. ${configKey}@gecm.edu`} 
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                autoComplete="username"
                required 
              />

              <Input 
                label="Password" 
                type="password" 
                id="password" 
                placeholder="Enter password" 
                required 
              />
              
              <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberUserId}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setRememberUserId(checked);
                      if (!checked) localStorage.removeItem(rememberedUserIdKey);
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                  <span>Remember ID</span>
                </label>
                <a href="#" className="hover:text-blue-400 transition-colors">Forgot password?</a>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  style={{ backgroundColor: config.color }}
                  className="shadow-lg hover:brightness-110 active:brightness-95"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-4 sm:px-8 py-3 text-center text-[10px] text-slate-500 z-10">
        <span>GECM Security Gateway • Authorized Staff & Students Only</span>
      </footer>
    </div>
  );
}
