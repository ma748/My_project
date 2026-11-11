import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, UserPlus, UserRoundCog } from 'lucide-react';

export default function AdmissionsSection() {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-lg">
        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400">Office Admissions</span>
        <h2 className="text-xl font-bold text-slate-100 mt-1">Admission Section</h2>
        <p className="text-sm text-slate-400 mt-2">
          Choose the admission workflow you want to manage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Link
          to="new"
          className="p-6 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:bg-blue-600/10 hover:border-blue-500/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group"
        >
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <UserPlus size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-100">New Admission</h3>
            <p className="text-xs text-slate-400 mt-1">
              Review regular admission applications and complete document verification.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-400">
              Open New Admission <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="/dashboard/office/students"
          className="p-6 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:bg-violet-600/10 hover:border-violet-500/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group"
        >
          <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
            <UserRoundCog size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-100">Update Admission</h3>
            <p className="text-xs text-slate-400 mt-1">Find records by Student ID, name, admission number, batch, or department.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-400">
              Open Update Admission <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="lateral-entry"
          className="p-6 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:bg-emerald-600/10 hover:border-emerald-500/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group"
        >
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <BookOpenCheck size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-100">Lateral Entry</h3>
            <p className="text-xs text-slate-400 mt-1">
              Manage direct second-year students, previous qualification details, fees, and progress.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
              Open Lateral Entry <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
