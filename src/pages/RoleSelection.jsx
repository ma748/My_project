import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, BookOpen, Building2, GraduationCap, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function RoleSelection() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'principal',
      title: 'Principal',
      code: 'EXEC-01',
      path: '/login/principal',
      desc: 'Institutional analytics & governance control',
      icon: Landmark,
      accent: 'amber',
      glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
      borderColor: 'group-hover:border-amber-500/50',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'hod',
      title: 'HOD',
      code: 'DEPT-02',
      path: '/login/hod',
      desc: 'Branch intelligence, faculty & student metrics',
      icon: BookOpen,
      accent: 'emerald',
      glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      borderColor: 'group-hover:border-emerald-500/50',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'office',
      title: 'Office',
      code: 'ADM-03',
      path: '/login/office',
      desc: 'Admission verification, records & fee ledgers',
      icon: Building2,
      accent: 'blue',
      glow: 'from-blue-600/25 via-blue-600/5 to-transparent',
      borderColor: 'group-hover:border-blue-500/50',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'student',
      title: 'Student',
      code: 'STD-04',
      path: '/login/student',
      desc: 'Academic timeline, fees receipt & profile',
      icon: GraduationCap,
      accent: 'indigo',
      glow: 'from-indigo-600/25 via-indigo-600/5 to-transparent',
      borderColor: 'group-hover:border-indigo-500/50',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    }
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Top Technical Navigation Header */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm tracking-wider shadow-inner">
            4HG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="nothing-pill text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 border-blue-500/30">
                GECM.SYS // ERP 2.6
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                ONLINE
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero & Center Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-4 sm:py-8 z-10 max-w-7xl w-full mx-auto">
        <div className="text-center max-w-3xl mb-5 sm:mb-8 md:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-md mb-2.5 sm:mb-4">
            <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
            <span>Government of Karnataka • VTU Affiliated • AICTE Approved</span>
          </div>

          <h1 className="text-xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-slate-950 via-blue-900 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-sm">
              Government Engineering College
            </span>
            <span className="block text-sm sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-400 tracking-wide mt-1.5">
              Mosalehosahalli — 573212
            </span>
          </h1>

          <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto px-2">
            Select your administrative authority or student workspace to initialize secure access.
          </p>
        </div>

        {/* 3D Neo-Tech Cards Grid (2x2 on Mobile, 4 Cols on Desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 w-full max-w-6xl">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                onClick={() => navigate(role.path)}
                className="group relative cursor-pointer select-none"
              >
                {/* 3D Radial Backlight */}
                <div
                  className={`absolute -inset-0.5 rounded-2xl sm:rounded-3xl bg-gradient-to-b ${role.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none`}
                />

                <div
                  className={`relative h-full flex flex-col justify-between p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl neo-card-3d border border-slate-200/90 dark:border-white/10 ${role.borderColor} overflow-hidden backdrop-blur-xl specular-border-top`}
                >
                  {/* Card Header: Technical Code & Action Arrow */}
                  <div className="flex items-center justify-between mb-3 sm:mb-5">
                    <span className={`nothing-pill border ${role.badgeColor}`}>
                      {role.code}
                    </span>
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white group-hover:border-blue-300 dark:group-hover:border-white/30 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                      <ArrowUpRight size={13} />
                    </div>
                  </div>

                  {/* Center Icon & 3D Lighting Ring */}
                  <div className="my-2 sm:my-4 flex flex-col items-center text-center">
                    <div className={`h-11 w-11 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-2xl border flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-2 transition-all duration-300 ${role.iconBg}`}>
                      <Icon size={24} className="sm:hidden" />
                      <Icon size={30} className="hidden sm:block" />
                    </div>

                    <h2 className="mt-3 sm:mt-4 text-sm sm:text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                      {role.title}
                    </h2>

                    <p className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed px-1">
                      {role.desc}
                    </p>
                  </div>

                  {/* Card Bottom: Access Pill */}
                  <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                    <span className="uppercase tracking-wider">Access</span>
                    <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      AUTH →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Public Admission Portal Callout Pill */}
        <div className="mt-6 sm:mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/admission"
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-lg hover:shadow-blue-500/20 transition-all group"
          >
            <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Candidate Online Admission Portal</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">New Intake</span>
          </Link>
        </div>
      </main>

      {/* Technical Footer */}
      <footer className="w-full px-4 sm:px-8 py-3 sm:py-4 border-t border-slate-200/80 dark:border-white/5 text-[10px] sm:text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span>Campus ERP Node // Hassan Region</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Security Protocol TLS v1.3</span>
        </div>
        <div className="font-mono text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-600">
          SYS_ID: 4HG-2026-CAMPUS-ERP
        </div>
      </footer>
    </div>
  );
}
