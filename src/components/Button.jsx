import React from 'react';

export function Button({ children, variant = 'primary', style, ...props }) {
  const baseStyle = {
    width: '100%',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '1rem',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    ...style
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--accent-primary)',
      color: 'white',
      boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'var(--text-main)',
      border: '1px solid var(--border-color)',
    }
  };

  const variantStyle = variants[variant] || variants.primary;

  return (
    <button
      style={{ ...baseStyle, ...variantStyle }}
      onMouseOver={(e) => {
        if (variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
        if (variant === 'secondary') e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)';
      }}
      onMouseOut={(e) => {
        if (variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
        if (variant === 'secondary') e.currentTarget.style.backgroundColor = 'transparent';
      }}
      {...props}
    >
      {children}
    </button>
  );
}
