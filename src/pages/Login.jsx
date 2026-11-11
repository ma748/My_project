import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserCircle, Briefcase, GraduationCap, Building2, ArrowLeft, Mail, Lock, Eye, EyeOff, BookOpen } from 'lucide-react';
import './Login.css';

const ROLE_CONFIG = {
  principal: {
    title: 'Principal Portal',
    icon: Building2,
    color: 'var(--color-principal)',
    prefix: 'PRN',
  },
  hod: {
    title: 'HOD Portal',
    icon: Briefcase,
    color: 'var(--color-hod)',
    prefix: 'HOD',
  },
  staff: {
    title: 'Staff Portal',
    icon: UserCircle,
    color: 'var(--color-staff)',
    prefix: 'STF',
  },
  student: {
    title: 'Student Portal',
    icon: GraduationCap,
    color: 'var(--color-student)',
    prefix: 'STD',
  }
};

export default function Login() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const config = ROLE_CONFIG[roleId];

  useEffect(() => {
    if (!config) {
      navigate('/');
    }
  }, [config, navigate]);

  if (!config) return null;

  const Icon = config.icon;

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const userId = e.target.userId?.value.toLowerCase().trim();
    const password = e.target.password?.value;

    setTimeout(() => {
      setIsLoading(false);
      
      // Mock Authentication Flow
      if (roleId === 'principal') {
        if (userId === 'admin' && password === 'admin123') {
          navigate('/dashboard/principal');
        } else {
          alert('Invalid credentials. For demo, use admin / admin123');
        }
      } else {
        alert(`Successfully logged in as ${config.title}`);
      }
    }, 1500);
  };

  return (
    <div className="login-container">
      <button className="back-button" onClick={() => navigate('/')}>
        <ArrowLeft size={20} />
        <span>Back to Roles</span>
      </button>

      <div className="login-box glass-panel animate-fade-in" style={{ '--theme-color': config.color }}>
        <div className="login-header">
          <div className="login-icon" style={{ background: `color-mix(in srgb, ${config.color} 20%, transparent)` }}>
            <Icon size={40} color={config.color} />
          </div>
          <h2>{config.title}</h2>
          <p>Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {roleId === 'hod' && (
            <div className="input-group">
              <label>Department</label>
              <div className="input-wrapper">
                <BookOpen className="input-icon" size={20} />
                <select required className="department-select" name="department">
                  <option value="" disabled selected>Choose a department...</option>
                  <option value="AI">Artificial Intelligence & Engineering</option>
                  <option value="CS">Computer science & Engineering</option>
                  <option value="EC">Electronic Communication & Engineering</option>
                  <option value="EE">Electric and Electronic Engineering</option>
                  <option value="CV">Civil Engineering</option>
                  <option value="ME">Mechanical Engineering</option>
                </select>
              </div>
            </div>
          )}

          <div className="input-group">
            <label>User ID</label>
            <div className="input-wrapper">
              <UserCircle className="input-icon" size={20} />
              <input type="text" name="userId" placeholder={`e.g. ${config.prefix}10024`} required />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                name="password"
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required 
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <label className="remember-me">
              <input type="checkbox" name="remember" />
              <span>Remember for 30 days</span>
            </label>
            <a href="#" className="forgot-password" style={{ color: config.color }}>
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            className="btn-primary submit-btn" 
            disabled={isLoading}
            style={{ 
              background: isLoading ? 'transparent' : config.color,
              borderColor: config.color
            }}
          >
            {isLoading ? <div className="loader"></div> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
