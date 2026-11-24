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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              Add new student admissions for Regular (PUC) and Lateral Entry (Diploma) students.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-400">
              Open New Admission <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="update"
          className="p-6 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:bg-violet-600/10 hover:border-violet-500/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 group"
        >
          <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
            <UserRoundCog size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-100">Update Admission</h3>
            <p className="text-xs text-slate-400 mt-1">
              Locate and update existing admissions, assign official IDs and USNs, and update records.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-400">
              Open Update Admission <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
