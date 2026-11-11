import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const roleConfig = {
  principal: {
    title: 'Principal Login',
    desc: 'Access institutional analytics and high-level controls',
    icon: '🏛️',
    color: '#f59e0b', // amber
  },
  hod: {
    title: 'HOD Login',
    desc: 'Manage departmental affairs and faculty',
    icon: '📚',
    color: '#10b981', // emerald
  },
  office: {
    title: 'Office Login',
    desc: 'Handle fee collections and admissions portal',
    icon: '🏢',
    color: '#3b82f6', // blue
  },
  student: {
    title: 'Student Login',
    desc: 'Access your academic records and pay fees',
    icon: '🎓',
    color: '#8b5cf6', // violet
  }
};

export function LoginModule() {
  const { role } = useParams();
  const navigate = useNavigate();

  // Map URL param to actual role values
  const getInitialRole = (r) => {
    if (r === 'hod') return 'HOD';
    if (r === 'office') return 'Staff';
    if (r === 'principal') return 'Principal';
    return 'student'; // Fallback
  };

  const selectedRole = getInitialRole(role);
  const [branch, setBranch] = useState('CSE');
  const [loading, setLoading] = useState(false);

  const configKey = selectedRole.toLowerCase() === 'staff' ? 'office' : selectedRole.toLowerCase();
  const config = roleConfig[configKey] || roleConfig.student;
  const rememberedUserIdKey = `rememberedUserId:${configKey}`;
  const [userId, setUserId] = useState(() => localStorage.getItem(rememberedUserIdKey) || '');
  const [rememberUserId, setRememberUserId] = useState(() => Boolean(localStorage.getItem(rememberedUserIdKey)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const password = e.target.elements.password.value;
    
    if (!userId || !password) {
      return toast.error('All fields are required');
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        email: userId,
        password,
        role: selectedRole,
        branch: selectedRole === 'HOD' ? branch : undefined
      });

      if (rememberUserId) localStorage.setItem(rememberedUserIdKey, userId.trim());
      else localStorage.removeItem(rememberedUserIdKey);
      
      // Store token and email for dashboard greeting
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user?.userId || userId);
      localStorage.setItem('userRole', selectedRole);
      if (res.data.user?.id) {
        localStorage.setItem('userId', res.data.user.id);
      }
      if (res.data.user?.email) {
        localStorage.setItem('userEmail', res.data.user.email);
      }
      if (res.data.user?.branch) {
        localStorage.setItem('userBranch', res.data.user.branch);
      }
      
      toast.success('Login Successful!');
      
      // Navigate to correct dashboard based on role
      setTimeout(() => {
        if (selectedRole === 'Principal') {
          navigate('/dashboard/principal');
        } else if (selectedRole === 'HOD') {
          navigate('/dashboard/hod');
        } else if (selectedRole === 'Staff') {
          navigate('/dashboard/office');  
        } else if (selectedRole === 'student') {
          navigate('/dashboard/student');
        } else {
          toast.success(`Logged in successfully! Dashboard module pending.`);
        }
      }, 1000);
      
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials or connection error');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}>
      <Toaster position="top-right" />
      <Button 
        variant="secondary" 
        onClick={() => navigate('/')} 
        style={{ position: 'absolute', top: '2rem', left: '2rem', width: 'auto' }}
      >
        ← Back to Roles
      </Button>

      <Card style={{ maxWidth: '400px', width: '100%', margin: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{config.icon}</div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {config.title}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>{config.desc}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          


          {selectedRole === 'HOD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Select Branch</label>
              <select 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)} 
                style={{ width: '100%', padding: '0.625rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', appearance: 'none', marginBottom: '0.5rem' }}
              >
                <option value="CSE" style={{ background: '#ffffff', color: '#172033' }}>CSE</option>
                <option value="ECE" style={{ background: '#ffffff', color: '#172033' }}>ECE</option>
                <option value="ME" style={{ background: '#ffffff', color: '#172033' }}>ME</option>
                <option value="Civil" style={{ background: '#ffffff', color: '#172033' }}>Civil</option>
              </select>
            </div>
          )}

          <Input 
            label={selectedRole === 'student' ? 'Student ID' : 'User ID'} 
            id="userId" 
            type="text"
            placeholder={selectedRole === 'student' ? 'Enter your Student ID (for example, 2026CS001)' : `Enter your ${selectedRole} ID`} 
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            autoComplete="username"
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            id="password" 
            placeholder="Enter your password" 
            required 
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={rememberUserId} onChange={(event) => {
                const checked = event.target.checked;
                setRememberUserId(checked);
                if (!checked) localStorage.removeItem(rememberedUserIdKey);
              }} /> Remember user ID
            </label>
            <a href="#" style={{ color: config.color, textDecoration: 'none' }}>Forgot password?</a>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            style={{ 
              backgroundColor: config.color, 
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
