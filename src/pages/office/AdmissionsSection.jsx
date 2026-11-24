import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserPlus, UserRoundCog } from 'lucide-react';

export default function AdmissionsSection() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner with 3D Neo-Tech styling */}
      <div className="neo-card-3d rounded-2xl sm:rounded-3xl p-4 sm:p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="nothing-pill text-[10px] text-blue-400 bg-blue-500/10 border-blue-500/20">
                OFFICE // ADM.SYS
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-slate-100">
              Admission Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Process new candidate enrollments (Regular PUC & Lateral Entry Diploma) or update existing student records and official identifiers.
            </p>
          </div>
        </div>
      </div>

      {/* 2 Primary Admission Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
        <Link
          to="new"
          className="neo-card-3d rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300 block"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(28,105,212,0.4)] transition-all">
              <UserPlus size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="nothing-pill text-[9px] sm:text-[10px] text-blue-300 bg-blue-500/10 border-blue-500/20">
              FLOW // 01
            </span>
          </div>

          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              New Admission
              <ArrowRight size={16} className="text-blue-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Enroll incoming students for both <strong>Regular Admission (PUC/12th)</strong> and <strong>Lateral Entry (Diploma)</strong>. Official USN & Student ID are optional initially.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-400">
            <span>Launch Entry Form</span>
            <span className="text-[11px] font-mono text-slate-500 group-hover:text-blue-300 transition-colors">START →</span>
          </div>
        </Link>

        <Link
          to="update"
          className="neo-card-3d rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300 block"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all">
              <UserRoundCog size={24} className="sm:w-7 sm:h-7" />
            </div>
            <span className="nothing-pill text-[9px] sm:text-[10px] text-violet-300 bg-violet-500/10 border-violet-500/20">
              FLOW // 02
            </span>
          </div>

          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              Update Admission
              <ArrowRight size={16} className="text-violet-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Search and modify existing admission records. Assign generated USN, Student ID, or Admission Numbers when available from the university.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-violet-400">
            <span>Search & Edit Records</span>
            <span className="text-[11px] font-mono text-slate-500 group-hover:text-violet-300 transition-colors">UPDATE →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
