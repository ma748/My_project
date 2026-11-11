import React from 'react';

export function Input({ label, type = 'text', id, placeholder, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
      {label && (
        <label htmlFor={id} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'var(--input-bg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          fontSize: '1rem',
          boxSizing: 'border-box'
        }}
        {...props}
      />
    </div>
  );
}
