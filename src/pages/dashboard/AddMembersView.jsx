import { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, User, Shield, CheckCircle } from 'lucide-react';
import EmailOtpVerification from '../../components/EmailOtpVerification';

export default function AddMembersView() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Staff',
    branch: 'CSE',
    password: '',
    confirmPassword: ''
  });
  
  const [step, setStep] = useState(1); // 1: Details & OTP Verification | 2: Account Registered Success
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!isEmailVerified) {
      return setError("Please verify your email address via OTP first.");
    }

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    
    if (formData.password.length < 8) {
      return setError("Password must be at least 8 characters long");
    }

    setLoading(true);
    try {
      await axios.post('/api/users/add', formData);
      setMessage("User Registered Successfully!");
      setStep(2); // Success Screen
    } catch (err) {
      setError(err.response?.data?.error || "Error registering user");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
    if (e.target.name === 'email') {
      setIsEmailVerified(false);
    }
  };

  return (
    <div className="view-container animate-fade-in" style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Add Login Members</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Register new administrative and staff accounts securely.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Registration Complete</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {formData.name} ({formData.email}) has been granted {formData.role} access.
            </p>
            <button className="btn-primary" onClick={() => {
              setStep(1);
              setIsEmailVerified(false);
              setFormData({ name: '', email: '', role: 'Staff', branch: 'CSE', password: '', confirmPassword: '' });
              setMessage('');
              setError('');
            }} style={{ background: 'var(--color-principal)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Register Another Member
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Account Details Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--accent-primary)' }} />
                  <input required name="name" value={formData.name} onChange={handleChange} type="text" placeholder="John Doe" style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none', cursor: 'text' }} />
                </div>
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Role Designation</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Shield size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)' }} />
                  <select required name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none', appearance: 'none' }}>
                    <option value="HOD" style={{background: '#121214'}}>HOD</option>
                    <option value="Staff" style={{background: '#121214'}}>Staff</option>
                  </select>
                </div>
              </div>

              {formData.role === 'HOD' && (
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Branch</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Shield size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)' }} />
                    <select required name="branch" value={formData.branch} onChange={handleChange} style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none', appearance: 'none' }}>
                      <option value="CSE" style={{background: '#121214'}}>CSE</option>
                      <option value="ECE" style={{background: '#121214'}}>ECE</option>
                      <option value="ME" style={{background: '#121214'}}>ME</option>
                      <option value="Civil" style={{background: '#121214'}}>Civil</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Create Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--accent-primary)' }} />
                  <input required name="password" value={formData.password} onChange={handleChange} type="password" placeholder="Min. 8 characters" style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none', cursor: 'text' }} />
                </div>
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)' }} />
                  <input required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type="password" placeholder="Re-enter password" style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.5rem 0' }} />

            {/* Email OTP Verification Section */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Email Verification</h3>
              <EmailOtpVerification
                email={formData.email}
                onEmailChange={(val) => {
                  setFormData(prev => ({ ...prev, email: val }));
                  setIsEmailVerified(false);
                }}
                onVerified={() => {
                  setIsEmailVerified(true);
                  setError('');
                }}
              />
            </div>

            {/* Submit Button */}
            {isEmailVerified && (
              <button 
                type="button" 
                onClick={handleRegister} 
                disabled={loading || !formData.name || !formData.password}
                style={{ 
                  background: 'var(--color-principal, #8b5cf6)', 
                  color: 'white', 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  border: 'none', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  fontWeight: '600', 
                  fontSize: '1rem',
                  marginTop: '1rem',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)'
                }}
              >
                {loading ? 'Registering Account...' : 'Complete Account Registration'}
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
