import React from 'react';

export function Input({ label, type = 'text', id, placeholder, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5 mb-3 sm:mb-4">
      {label && (
        <label htmlFor={id} className="text-xs sm:text-sm font-semibold text-slate-300 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        placeholder={placeholder}
        className={`
          w-full px-3.5 py-2.5 sm:py-3 rounded-xl
          bg-slate-900/60 dark:bg-slate-950/60
          border border-slate-700/70 dark:border-white/10
          text-slate-100 placeholder-slate-500
          text-sm sm:text-base outline-none
          focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25
          transition-all duration-200
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
