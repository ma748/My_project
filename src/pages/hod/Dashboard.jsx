import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { Home, Users, LogOut } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { clearSessionStorage } from '../../utils/authStorage';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [userBranch, setUserBranch] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0 });

  useEffect(() => {
    // Authentication is handled by ProtectedRoute
    setUserEmail(localStorage.getItem('userEmail') || 'hod@gecm.edu');
    setUserBranch(localStorage.getItem('userBranch') || 'General');

    // Fetch dynamic stats for dashboard
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/hod/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch stats');
      }
    };
    
    // Only fetch stats if on the main dashboard view
    if (location.pathname === '/dashboard/hod') {
      fetchStats();
    }
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    clearSessionStorage();
    toast.success('Logged out successfully');
    setTimeout(() => navigate('/'), 1000);
  };

  const navItems = [
    { name: 'Home', path: '/dashboard/hod', icon: Home },
    { name: 'View Student Details', path: '/dashboard/hod/students', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b]/70 border-r border-slate-700 backdrop-blur-xl flex flex-col justify-between hidden md:flex z-10 transition-all duration-300 shadow-xl">
        <div>
          <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
            <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">HOD Portal</h2>
              <p className="text-xs text-slate-400">GECM Admin</p>
            </div>
          </div>
          
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/20 shadow-sm' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700/50">
          <div className="mb-4 px-3 py-2 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Logged in as</p>
            <p className="text-sm font-medium text-slate-200 truncate" title={userEmail}>
              {userEmail}
            </p>
            <p className="text-xs text-emerald-400 mt-1">Branch: {userBranch}</p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-slate-700/50 bg-[#1e293b]/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 w-full transition-all">
            <h1 className="text-xl font-semibold text-emerald-400">
            {location.pathname === '/dashboard/hod' ? 'Dashboard Home' : 'Student Management'}
          </h1>
        </header>
        
        <main className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar">
          {location.pathname === '/dashboard/hod' ? (
            <div className="animate-fade-in max-w-5xl">
              {/* VTU Education Thought Banner Card - Exact Screenshot Replica */}
              <div className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0b1329] via-[#0f1c3a] to-[#0b1329] border border-blue-900/50 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                {/* Ambient background glows */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Left Quote Section */}
                <div className="flex-1 space-y-4 z-10">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-snug tracking-tight">
                    &quot;Education is the foundation of progress. It shapes character, strengthens the mind, and builds a nation of capable, disciplined citizens.&quot;
                  </h2>

                  <p className="text-sm font-semibold text-slate-300">
                    - Sir M. Visvesvaraya
                  </p>
                </div>

                {/* Right Side Bharat Ratna Sir M. Visvesvaraya Card */}
                <div className="z-10 shrink-0 w-full lg:w-auto">
                  <div className="p-4 md:p-5 rounded-2xl bg-[#121c38]/90 border border-blue-800/40 backdrop-blur-md flex items-center gap-4 shadow-xl max-w-sm">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 border border-blue-500/30 shadow-md">
                      <img 
                        src="/visvesvaraya.jpg" 
                        alt="Sir M. Visvesvaraya" 
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase block">
                        BHARAT RATNA
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        Sir M. Visvesvaraya
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        Engineer, statesman, and visionary
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Welcome & Department Info Header */}
              <div className="mb-8 p-6 rounded-2xl bg-[#1e293b]/60 border border-slate-700/60 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{userBranch} Department Dashboard</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Logged in as <span className="text-emerald-400 font-medium">{userEmail}</span> • Managing <span className="text-emerald-400 font-medium">{userBranch}</span> student records.
                  </p>
                </div>
                <Link to="/dashboard/hod/students" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20 shrink-0">
                  View Student Details
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Stat Card */}
                 <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                    <div className="text-emerald-500 mb-2 font-bold text-3xl">{stats.totalStudents}</div>
                    <div className="text-slate-400 text-sm">Total Enrolled Students in {userBranch} Department</div>
                 </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-[#1e293b] border border-slate-700 p-8 rounded-2xl max-w-sm w-full shadow-2xl transform scale-100">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Logout</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to end your session as HOD?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-lg shadow-rose-600/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
