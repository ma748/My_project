import { useState, useEffect } from 'react';
import { Users, X, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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

export default function HomeView() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, year1: 0, year2: 0, year3: 0, year4: 0 });
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const branchColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316'];
  const yearColors = ['#14b8a6', '#f97316', '#ec4899', '#6366f1'];
  const branchData = normalizeBranchDistribution(stats.branchWiseStudents);
  const yearBranchData = normalizeYearBranchDistribution(stats.yearBranchStudents);
  const chartBranches = branchData.map(item => item.branch);
  const maxBranchCount = Math.max(...branchData.map(item => item.count), 1);
  const maxYearBranchCount = Math.max(...yearBranchData.map(item => item.count), 1);
  const getYearBranchCount = (year, branch) => yearBranchData.find(
    item => Number(item.year) === year && item.branch === branch
  )?.count || 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
        toast.error("Failed to load statistics");
      } finally {
        setDashboardStatsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleYearClick = (year, count) => {
    toast(`Year ${year} Students: ${count}`, {
      icon: '📊',
      style: { borderRadius: '10px', background: '#1e293b', color: '#fff' }
    });
    // Navigate to view-students with year filter
    navigate(`?tab=view-students&year=${year}`);
  };

  return (
    <div className="view-container animate-fade-in" style={{ position: 'relative' }}>
      
      {/* VTU Education Thought Banner Card - Exact Matching Design */}
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

      {/* Stats Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div 
          onClick={() => setIsModalOpen(true)}
          className="stat-card glass-panel" 
          style={{ padding: '1.5rem', display: 'flex', itemsCenter: 'center', gap: '1.5rem', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div className="stat-icon" style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Students</h3>
            <p style={{ fontSize: '2rem', fontWeight: '800' }}>{stats.total}</p>
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'inline-block', marginTop: '0.25rem' }}>Click for insights</span>
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
            {stats.total} students
          </span>
        </div>
        {dashboardStatsLoading ? (
          <div className="h-56 animate-pulse rounded-2xl bg-slate-800/50" />
        ) : branchData.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-xs text-slate-500">No branch data available</div>
        ) : (
          <div className="flex gap-3">
            <div className="flex h-48 flex-col justify-between border-r border-slate-700/70 pr-2 text-[9px] text-slate-500">
              <span>{maxBranchCount}</span>
              <span>{Math.round(maxBranchCount * 0.75)}</span>
              <span>{Math.round(maxBranchCount * 0.5)}</span>
              <span>{Math.round(maxBranchCount * 0.25)}</span>
              <span>0</span>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="relative grid min-h-56 min-w-[34rem] grid-cols-2 items-end gap-4 border-b-2 border-slate-600/80 sm:grid-cols-3 lg:grid-cols-5">
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
                    <span className="w-full truncate text-center text-[11px] font-semibold text-slate-400" title={item.branch}>{item.branch}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Branches</div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
            <BarChart3 size={18} className="text-emerald-400" />
            Year-wise Branch Distribution
          </h2>
          <p className="mt-1 text-xs text-slate-400">Approved student registrations by study year and branch</p>
        </div>
        {chartBranches.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
            {chartBranches.map((branch, index) => (
              <span key={branch} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: branchColors[index % branchColors.length] }} />
                {branch}
              </span>
            ))}
          </div>
        )}
        {dashboardStatsLoading ? (
          <div className="h-56 animate-pulse rounded-2xl bg-slate-800/50" />
        ) : chartBranches.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-xs text-slate-500">No year data available</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((year, yearIndex) => (
              <div key={year} className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-3">
                <div className="mb-3 text-center text-xs font-bold" style={{ color: yearColors[yearIndex] }}>Year {year}</div>
                <div className="flex h-40 items-end justify-center gap-1.5 border-b border-slate-700/80">
                  {chartBranches.map((branch, branchIndex) => {
                    const count = getYearBranchCount(year, branch);
                    const color = branchColors[branchIndex % branchColors.length];
                    return (
                      <div key={branch} className="flex h-full w-full max-w-8 flex-col items-center justify-end gap-1" title={`${branch}, Year ${year}: ${count} students`}>
                        {count > 0 && <span className="text-[9px] font-bold text-slate-300">{count}</span>}
                        <div
                          className="w-full rounded-t-md transition-all duration-700"
                          style={{ height: `${count ? Math.max((count / maxYearBranchCount) * 100, 8) : 3}%`, backgroundColor: count ? color : '#334155', boxShadow: count ? `0 0 12px ${color}55` : 'none' }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-center gap-1 overflow-hidden">
                  {chartBranches.map(branch => (
                    <span key={branch} className="max-w-10 truncate text-[8px] text-slate-500" title={branch}>{branch}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      {/* Modal Popup */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="glass-panel"
            style={{
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              transform: 'scale(1)',
              animation: 'scaleIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={24} color="#8b5cf6" />
              Student Demographics
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Year-wise breakdown of total registered students ({stats.total}).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div 
                onClick={() => { setIsModalOpen(false); handleYearClick(1, stats.year1); }}
                style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', borderLeft: '3px solid #10b981', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
              >
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>1st Year</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{stats.year1}</p>
              </div>
              
              <div 
                onClick={() => { setIsModalOpen(false); handleYearClick(2, stats.year2); }}
                style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', borderLeft: '3px solid #f59e0b', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
              >
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>2nd Year</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{stats.year2}</p>
              </div>
              
              <div 
                onClick={() => { setIsModalOpen(false); handleYearClick(3, stats.year3); }}
                style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', borderLeft: '3px solid #8b5cf6', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
              >
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>3rd Year</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{stats.year3}</p>
              </div>
              
              <div 
                onClick={() => { setIsModalOpen(false); handleYearClick(4, stats.year4); }}
                style={{ padding: '1rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', borderLeft: '3px solid #ec4899', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'}
              >
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>4th Year</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{stats.year4}</p>
              </div>
            </div>
            
            <style>
              {`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
              `}
            </style>
          </div>
        </div>
      )}
    </div>
  );
}
