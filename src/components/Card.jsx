import React from 'react';

export function Card({ children, className = '', style, ...props }) {
  return (
    <div
      className={`
        neo-card-3d
        p-4 sm:p-6 md:p-8
        rounded-2xl sm:rounded-3xl
        animate-fade-in
        ${className}
      `}
      {...props}
      style={{
        ...style
      }}
    >
      {children}
    </div>
  );
}
