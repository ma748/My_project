import React from 'react';

export function Button({ children, variant = 'primary', className = '', style, ...props }) {
  const isPrimary = variant === 'primary';

  return (
    <button
      className={`
        w-full inline-flex items-center justify-center gap-2
        px-4 py-2.5 sm:py-3 rounded-xl
        text-xs sm:text-sm md:text-base font-bold
        cursor-pointer select-none
        transition-all duration-200 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isPrimary
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/20'
            : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20'
        }
        ${className}
      `}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
