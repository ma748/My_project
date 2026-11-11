import React from 'react';

export function Card({ children, className = '', style, ...props }) {
  return (
    <div className={`
      bg-[var(--glass-bg)] 
      backdrop-blur-md 
      border border-[var(--glass-border)] 
      rounded-2xl 
      p-8 
      shadow-2xl 
      animate-fade-in
      ${className}
    `}
    {...props}
    style={{
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '1rem',
      padding: '2rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      ...style,
    }}>
      {children}
    </div>
  );
}
