import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';

export function RoleSelection() {
  const navigate = useNavigate();

  const roles = [
    { title: 'Principal', path: '/login/principal', desc: 'Access high-level dashboards', icon: '🏛️' },
    { title: 'HOD', path: '/login/hod', desc: 'Manage department analytics', icon: '📚' },
    { title: 'Office', path: '/login/office', desc: 'Handle fees and admissions', icon: '🏢' },
    { title: 'Student', path: '/login/student', desc: 'View records and pay fees', icon: '🎓' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Government Engineering College Mosalehosahalli-573212
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>
          Please select your role to continue
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1200px', padding: '0 2rem', boxSizing: 'border-box' }}>
        {roles.map((role) => (
          <div key={role.title} onClick={() => navigate(role.path)} style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}>
            <Card className="hover:scale-105" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 30px 60px -12px rgba(59, 130, 246, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 25px 50px -12px var(--shadow-color)'; }}
            >
              <div style={{ fontSize: '4rem', margin: '1rem 0' }}>
                {role.icon}
              </div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>{role.title}</h2>
              <p style={{ color: 'var(--text-muted)' }}>{role.desc}</p>
            </Card>
          </div>
        ))}
      </div>


    </div>
  );
}
