import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { Home, CheckSquare, Camera, CreditCard, Bell, LogOut, ArrowRight, Menu, X, UserCheck, Building2, ClipboardList, BadgeIndianRupee, PieChart, Users, BarChart3, Pencil, Save, X as CloseIcon, GraduationCap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../components/ThemeProvider';
import { feeDetailsRows, formatRupees } from '../../data/feeDetailsRows';
import { clearSessionStorage } from '../../utils/authStorage';

const normalizeBranchDistribution = (rows = []) => {
  const grouped = new Map();
  rows.forEach((item) => {
    const originalBranch = String(item.branch || '').trim();
    const branch = originalBranch.toUpperCase() === 'CS' ? 'CSE' : originalBranch;
    if (!branch) return;
    grouped.set(branch, (grouped.get(branch) || 0) + (Number(item.count) || 0));
  });
  return [...grouped].map(([branch, count]) => ({ branch, count }));
};

const normalizeYearBranchDistribution = (rows = []) => {
  const grouped = new Map();
  rows.forEach((item) => {
    const originalBranch = String(item.branch || '').trim();
    const branch = originalBranch.toUpperCase() === 'CS' ? 'CSE' : originalBranch;
    const year = Number(item.year);
    if (!branch) return;
    const key = `${year}-${branch}`;
    const current = grouped.get(key) || { ...item, year, branch, count: 0 };
    current.count += Number(item.count) || 0;
    grouped.set(key, current);
  });
  return [...grouped.values()];
};

export default function OfficeDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayAdmissions: 0,
    pendingVerification: 0,
    pendingFeePayments: 0,
    totalFeeCollected: 0,
    academicYear: '2026-2027',
    branchWiseStudents: [],
    yearWiseStudents: [],
    yearBranchStudents: [],
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [feeRows, setFeeRows] = useState(() => {
    try {
      const saved = localStorage.getItem('gecmFeeDetailsRows');
      return saved ? JSON.parse(saved) : feeDetailsRows;
    } catch {
      return feeDetailsRows;
    }
  });
  const [editingRow, setEditingRow] = useState(null);
  const [draftRow, setDraftRow] = useState(null);
  const [isOverallEditing, setIsOverallEditing] = useState(false);
  const [overallDraft, setOverallDraft] = useState([]);

  useEffect(() => {
    localStorage.setItem('gecmFeeDetailsRows', JSON.stringify(feeRows));
  }, [feeRows]);

  useEffect(() => {
    // Validate authentication
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (!token || (role !== 'office' && role !== 'Staff')) {
      navigate('/login/office');
    }
    setUserEmail(localStorage.getItem('userEmail') || 'office@gecm.edu');
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/office/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [location.pathname]);

  const handleLogout = () => {
    clearSessionStorage();
    toast.success('Logged out successfully');
    setTimeout(() => navigate('/'), 1000);
  };

  const startEditingRow = (row) => {
    setEditingRow(`${row.year}-${row.branch}`);
    setDraftRow({ ...row });
  };

  const cancelEditingRow = () => {
    setEditingRow(null);
    setDraftRow(null);
  };

  const saveEditedRow = () => {
    if (!draftRow) return;

    setFeeRows((prev) => prev.map((row) => {
      const key = `${row.year}-${row.branch}`;
      if (key !== editingRow) return row;

      const updatedRow = {
        ...row,
        ...draftRow,
        tuition: Number(draftRow.tuition || 0),
        admission: Number(draftRow.admission || 0),
        insurance: Number(draftRow.insurance || 0),
        pd: Number(draftRow.pd || 0),
      };
      updatedRow.total = updatedRow.tuition + updatedRow.admission + updatedRow.insurance + updatedRow.pd;
      return updatedRow;
    }));

    cancelEditingRow();
    toast.success('Fee details updated successfully');
  };

  const openOverallEdit = () => {
    setOverallDraft(feeRows.map((row) => ({ ...row })));
    setIsOverallEditing(true);
  };

  const saveOverallEdit = () => {
    setFeeRows((prev) => prev.map((row, index) => {
      const draft = overallDraft[index];
      if (!draft) return row;

      const updated = {
        ...row,
        ...draft,
        tuition: Number(draft.tuition || 0),
        admission: Number(draft.admission || 0),
        insurance: Number(draft.insurance || 0),
        pd: Number(draft.pd || 0),
      };
      updated.total = updated.tuition + updated.admission + updated.insurance + updated.pd;
      return updated;
    }));
    setIsOverallEditing(false);
    setOverallDraft([]);
    toast.success('Overall fee details updated successfully');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard/office', icon: Home },
    { name: 'Admissions', path: '/dashboard/office/admissions', icon: CheckSquare },
    { name: 'Student List', path: '/dashboard/office/students', icon: Users },
    { name: 'Edit Requests', path: '/dashboard/office/student-edit-requests', icon: ClipboardList },
    { name: 'Face Registration', path: '/dashboard/office/facerec', icon: Camera },
    { name: 'Fee Management', path: '/dashboard/office/fees', icon: CreditCard },
    { name: 'Fee Structure', path: '/dashboard/office/fee-structure', icon: BadgeIndianRupee },
    { name: 'Category Count', path: '/dashboard/office/category-count', icon: ClipboardList },
  ];

  const branchColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316'];
  const yearColors = ['#14b8a6', '#f97316', '#ec4899', '#6366f1'];
  const branchData = normalizeBranchDistribution(stats.branchWiseStudents);
  const maxBranchCount = Math.max(...branchData.map((item) => item.count), 1);
  const yearData = stats.yearWiseStudents || [];
  const yearBranchData = normalizeYearBranchDistribution(stats.yearBranchStudents);
  const chartYears = [1, 2, 3, 4];
  const chartBranches = branchData.map((item) => item.branch);
  const maxYearBranchCount = Math.max(...yearBranchData.map((item) => item.count), 1);
  const getYearBranchCount = (year, branch) => yearBranchData.find(
    (item) => Number(item.year) === year && item.branch === branch
  )?.count || 0;

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${isDarkMode ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
      <Toaster position="top-right" />

      {/* Sidebar for Desktop */}
      <div className="w-68 bg-slate-900/80 border-r border-slate-800 backdrop-blur-xl flex flex-col justify-between hidden lg:flex z-20 shadow-2xl">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="office-brand-mark text-blue-500 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
              <Building2 size={24} />
              <span className="text-2xl">🏢</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">Office Portal</h2>
              <p className="text-xs text-slate-400">GECM Administration</p>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard/office'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/15 border border-blue-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Icon size={19} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          <div className="mb-4 px-3.5 py-2.5 bg-slate-850/60 rounded-xl border border-slate-800/50">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Session Account</p>
            <p className="text-sm font-semibold text-slate-250 truncate" title={userEmail}>
              {userEmail.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 border border-transparent hover:border-rose-500/20"
          >
            <LogOut size={19} />
            <span className="text-sm font-medium">Log out Session</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <div className="w-68 bg-slate-900 border-r border-slate-800 flex flex-col justify-between relative z-50 p-4 animate-fade-in shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-6 mb-4 border-b border-slate-800">
                <div className="office-mobile-brand flex items-center gap-2">
                  <Building2 size={22} className="text-blue-400" />
                  <span className="text-xl">🏢</span>
                  <span className="font-bold text-slate-100">GECM Office</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = item.path === '/dashboard/office'
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-250 ${
                        isActive 
                          ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-500/15' 
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={19} />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => { setSidebarOpen(false); setShowLogoutConfirm(true); }}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 font-medium transition-all duration-200"
              >
                <LogOut size={19} />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 w-full">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-300 lg:hidden">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-blue-500">GECM</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-200 font-medium text-sm lg:text-base">
                {location.pathname === '/dashboard/office' ? 'Office Admin Hub' : 
                 location.pathname.includes('admissions') ? 'Admissions Verification' :
                 location.pathname.includes('fees') ? 'Fee Management' :
                 location.pathname.includes('category-count') ? 'Category Count' : 'Office Module'}
              </span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
              O
            </div>
          </div>
        </header>
        
        {/* Scrollable View Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#0b0f19]">
          {location.pathname === '/dashboard/office' ? (
            <div className="animate-fade-in max-w-6.5xl mx-auto space-y-8">
              
              {/* Header Hero Section */}
              <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-[#131e35] to-[#0f1d3a] border border-blue-500/10 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_28%),linear-gradient(135deg,rgba(16,185,129,0.12),transparent_44%)]"></div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:items-center">
                  <div className="max-w-3xl">
                    <blockquote className="mt-2">
                      <p className="text-2xl md:text-4xl font-extrabold text-slate-100 leading-tight tracking-normal">
                        "Education is the foundation of progress. It shapes character, strengthens the mind, and builds a nation of capable, disciplined citizens."
                      </p>
                      <footer className="mt-4 text-sm md:text-base text-slate-350 font-semibold">- Sir M. Visvesvaraya</footer>
                    </blockquote>
                  </div>
                  <div className="w-full max-w-sm lg:justify-self-end">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/30 border border-slate-800/60 shadow-lg">
                      <img
                        src="/sir-mv-visvesvaraya.png"
                        alt="Sir M. Visvesvaraya"
                        className="h-28 w-24 md:h-36 md:w-28 rounded-xl object-cover object-top border border-blue-500/20 shadow-xl"
                      />
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400">Bharat Ratna</span>
                        <h2 className="text-lg font-extrabold text-slate-100 mt-1 leading-tight">Sir M. Visvesvaraya</h2>
                        <p className="text-xs text-slate-350 mt-2 leading-relaxed">Engineer, statesman, and visionary</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
                      <BarChart3 size={18} className="text-blue-400" />
                      Branch-wise Student Distribution
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">Approved student registrations by department</p>
                  </div>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    {stats.totalStudents} students
                  </span>
                </div>

                {loading ? (
                  <div className="h-56 animate-pulse rounded-2xl bg-slate-800/50" />
                ) : branchData.length === 0 ? (
                  <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-xs text-slate-500">
                    No branch data available
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex h-48 flex-col justify-between border-r border-slate-700/70 pr-2 text-[9px] text-slate-500">
                      <span>{maxBranchCount}</span><span>{Math.round(maxBranchCount * 0.75)}</span><span>{Math.round(maxBranchCount * 0.5)}</span><span>{Math.round(maxBranchCount * 0.25)}</span><span>0</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="relative grid min-h-56 grid-cols-2 items-end gap-4 border-b-2 border-slate-600/80 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-800" />
                        <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-slate-800" />
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-800" />
                        <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-slate-800" />
                        {branchData.map((item, index) => (
                          <div key={item.branch} className="relative z-10 flex h-56 min-w-0 flex-col items-center justify-end gap-2">
                            <span className="text-sm font-bold text-slate-200">{item.count}</span>
                            <div className="flex h-40 w-full max-w-20 items-end rounded-t-xl bg-slate-950/50 p-1">
                              <div
                                className="w-full rounded-t-lg transition-all duration-700"
                                style={{
                                  height: `${Math.max((item.count / maxBranchCount) * 100, 8)}%`,
                                  backgroundColor: branchColors[index % branchColors.length],
                                  boxShadow: `0 0 18px ${branchColors[index % branchColors.length]}55`
                                }}
                                title={`${item.branch}: ${item.count} students`}
                              />
                            </div>
                            <span className="w-full truncate text-center text-[11px] font-semibold text-slate-400" title={item.branch}>
                              {item.branch}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Branches (X-axis)</div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
                      <BarChart3 size={18} className="text-emerald-400" />
                      Year-wise Branch Distribution
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">All study years with branch colors</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {chartBranches.map((branch, index) => (
                      <span key={branch} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: branchColors[index % branchColors.length] }} />
                        {branch}
                      </span>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="h-56 animate-pulse rounded-2xl bg-slate-800/50" />
                ) : chartBranches.length === 0 ? (
                  <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-xs text-slate-500">
                    No year data available
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex h-48 flex-col justify-between border-r border-slate-700/70 pr-2 text-[9px] text-slate-500">
                      <span>{maxYearBranchCount}</span><span>{Math.round(maxYearBranchCount * 0.75)}</span><span>{Math.round(maxYearBranchCount * 0.5)}</span><span>{Math.round(maxYearBranchCount * 0.25)}</span><span>0</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-2 gap-5 border-b-2 border-slate-600/80 pb-2 lg:grid-cols-4">
                        {chartYears.map((year) => (
                          <div key={year} className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-3">
                            <div className="mb-3 text-center text-xs font-bold text-slate-300">Year {year}</div>
                            <div className="flex h-40 items-end justify-center gap-1.5">
                              {chartBranches.map((branch, index) => {
                                const count = getYearBranchCount(year, branch);
                                const color = branchColors[index % branchColors.length];
                                return (
                                  <div key={branch} className="flex h-full w-full max-w-8 flex-col items-center justify-end gap-1" title={`${branch}, Year ${year}: ${count} students`}>
                                    {count > 0 && <span className="text-[9px] font-bold text-slate-300">{count}</span>}
                                    <div className="w-full rounded-t-md transition-all duration-700" style={{ height: `${count ? Math.max((count / maxYearBranchCount) * 100, 8) : 3}%`, backgroundColor: count ? color : '#334155', boxShadow: count ? `0 0 12px ${color}55` : 'none' }} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Study years (X-axis)</div>
                    </div>
                  </div>
                )}
              </section>

              {editingRow && draftRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                  <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Edit Fee Details</h3>
                        <p className="text-xs text-slate-400">{draftRow.year} • {draftRow.branch}</p>
                      </div>
                      <button type="button" onClick={cancelEditingRow} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
                        <CloseIcon size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Tuition Fee
                        <input
                          type="number"
                          value={draftRow.tuition}
                          onChange={(e) => setDraftRow({ ...draftRow, tuition: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Admission Fee
                        <input
                          type="number"
                          value={draftRow.admission}
                          onChange={(e) => setDraftRow({ ...draftRow, admission: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Insurance
                        <input
                          type="number"
                          value={draftRow.insurance}
                          onChange={(e) => setDraftRow({ ...draftRow, insurance: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        PD Amount
                        <input
                          type="number"
                          value={draftRow.pd}
                          onChange={(e) => setDraftRow({ ...draftRow, pd: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                        />
                      </label>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-right text-sm text-amber-300">
                      Total: {formatRupees((draftRow.tuition || 0) + (draftRow.admission || 0) + (draftRow.insurance || 0) + (draftRow.pd || 0))}
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                      <button type="button" onClick={cancelEditingRow} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                        Cancel
                      </button>
                      <button type="button" onClick={saveEditedRow} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                        <Save size={14} /> Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isOverallEditing && overallDraft.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                  <div className="max-h-[80vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Edit Overall Fee Details</h3>
                        <p className="text-xs text-slate-400">Update all fee rows for the academic year</p>
                      </div>
                      <button type="button" onClick={() => setIsOverallEditing(false)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
                        <CloseIcon size={16} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {overallDraft.map((row, index) => (
                        <div key={`${row.year}-${row.branch}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] md:items-end">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year</div>
                            <div className="mt-1 text-sm font-semibold text-slate-200">{row.year}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Branch</div>
                            <div className="mt-1 text-sm font-semibold text-slate-200">{row.branch}</div>
                          </div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Tuition
                            <input
                              type="number"
                              value={row.tuition}
                              onChange={(e) => {
                                const next = [...overallDraft];
                                next[index] = { ...next[index], tuition: Number(e.target.value) || 0 };
                                setOverallDraft(next);
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Admission
                            <input
                              type="number"
                              value={row.admission}
                              onChange={(e) => {
                                const next = [...overallDraft];
                                next[index] = { ...next[index], admission: Number(e.target.value) || 0 };
                                setOverallDraft(next);
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Insurance
                            <input
                              type="number"
                              value={row.insurance}
                              onChange={(e) => {
                                const next = [...overallDraft];
                                next[index] = { ...next[index], insurance: Number(e.target.value) || 0 };
                                setOverallDraft(next);
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            PD
                            <input
                              type="number"
                              value={row.pd}
                              onChange={(e) => {
                                const next = [...overallDraft];
                                next[index] = { ...next[index], pd: Number(e.target.value) || 0 };
                                setOverallDraft(next);
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsOverallEditing(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                        Cancel
                      </button>
                      <button type="button" onClick={saveOverallEdit} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                        <Save size={14} /> Save All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Grid */}
              <div className="hidden">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-slate-900/50 border border-slate-800/80 animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                    <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Total Students</span>
                    <div className="text-2xl font-bold text-slate-100 mt-2">{stats.totalStudents}</div>
                    <div className="text-xs text-emerald-400 mt-1 font-semibold">Active Profiles</div>
                  </div>

                  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                    <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Today's Admissions</span>
                    <div className="text-2xl font-bold text-blue-400 mt-2">{stats.todayAdmissions}</div>
                    <div className="text-xs text-blue-405 mt-1 font-semibold">Newly Admitted</div>
                  </div>

                  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                    <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Pending Verification</span>
                    <div className="text-2xl font-bold text-amber-500 mt-2">{stats.pendingVerification}</div>
                    <div className="text-xs text-amber-405 mt-1 font-semibold">Awaiting Review</div>
                  </div>

                  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                    <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Pending Fee Payments</span>
                    <div className="text-2xl font-bold text-purple-400 mt-2">{stats.pendingFeePayments}</div>
                    <div className="text-xs text-purple-455 mt-1 font-semibold font-semibold">Outstanding Dues</div>
                  </div>

                  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                    <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Total Fee Collected</span>
                    <div className="text-xl font-bold text-emerald-400 mt-2.5 truncate">₹{stats.totalFeeCollected.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-450 mt-1 font-semibold">Net Collections</div>
                  </div>
                </div>
              )}

              {/* Main Dashboard Widgets (Recent Admissions + Notifications) */}
              <div className="hidden">
                
                {/* Recent Admissions */}
                <div className="bg-slate-900/40 p-6 rounded-2.5xl border border-slate-800/60 shadow-lg flex flex-col justify-between h-[450px]">
                  <div>
                    <h2 className="office-widget-title text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <ClipboardList size={18} className="text-blue-500" />
                      <span className="text-blue-500">📝</span> Recent Admissions
                    </h2>
                    
                    <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                      {loading ? (
                        [...Array(4)].map((_, i) => (
                          <div key={i} className="h-12 rounded bg-slate-800/50 animate-pulse"></div>
                        ))
                      ) : stats.recentActivities.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-16">No recent activity logged</p>
                      ) : (
                        stats.recentActivities.map((act) => (
                          <div key={act.id} className="flex items-center justify-between p-3 bg-slate-950/20 border border-slate-850 rounded-xl">
                            <div>
                              <span className="text-xs font-semibold text-slate-200 block">{act.studentName}</span>
                              <span className="text-[10px] text-slate-450">{act.branch}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                act.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                act.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                              }`}>
                                {act.status}
                              </span>
                              <span className="text-[9px] text-slate-500 block mt-1">
                                {new Date(act.time).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <Link to="students" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold group self-start">
                    View Complete Student Directory <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* System Notifications / Alerts */}
                <div className="bg-slate-900/40 p-6 rounded-2.5xl border border-slate-800/60 shadow-lg flex flex-col justify-between h-[450px]">
                  <div>
                    <h2 className="office-widget-title text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <Bell size={18} className="text-amber-500" />
                      <span className="text-amber-500">🔔</span> Active System Notifications
                    </h2>
                    
                    <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                      <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">!</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-200">Biometric Facial Registration Pending</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">Several approved students are missing biometric facial signature datasets. Please complete registration in Face Recognition.</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">✓</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-200">Fee Structure Engine Loaded</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">Automated batch-wise fee assignment system is online. Fees will be auto-calculated upon student approval.</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">i</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-200">SMTP Notification Broadcast Server</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">All welcome credentials and receipt emails are successfully integrated with Ethereal SMTP simulation.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Link to="reports" className="text-xs text-blue-405 hover:text-blue-300 flex items-center gap-1 font-semibold group self-start">
                    Generate Financial Reports <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

              </div>

              </div>

              {/* Quick Action Grid */}
              <div className="hidden">
                <h2 className="text-base font-bold text-slate-100 mb-4">Office Sections</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Link to="admissions" className="office-quick-action p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:bg-blue-600/10 hover:border-blue-500/30 transition-all duration-200 flex items-center gap-3">
                    <UserCheck size={24} className="text-blue-400" />
                    <span className="text-2xl">👥</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Admission Section</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Verify and manage admission applications</p>
                    </div>
                  </Link>
                  <Link to="facerec" className="hidden">
                    <Camera size={24} className="text-blue-400" />
                    <span className="text-2xl">📷</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Biometric Register</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Enroll face images via webcam</p>
                    </div>
                  </Link>
                  <Link to="fees" className="office-quick-action p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:bg-emerald-600/10 hover:border-emerald-500/30 transition-all duration-200 flex items-center gap-3">
                    <BadgeIndianRupee size={24} className="text-blue-400" />
                    <span className="text-2xl">💰</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Fee Management Section</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Collect fees and track pending dues</p>
                    </div>
                  </Link>
                  <Link to="reports" className="hidden">
                    <PieChart size={24} className="text-blue-400" />
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Financial Reports</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Export & compile ledger data</p>
                    </div>
                  </Link>
                </div>
              </div>

            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-800 p-7 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-2">Confirm Logout</h3>
            <p className="text-slate-400 text-sm mb-6">Are you sure you want to securely end your office administrative session?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-rose-600/20"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
