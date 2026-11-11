import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';

export default function EmailOtpVerification({ email, onEmailChange, onVerified, title = "Verify Your Email", description = "Register new administrative and staff accounts securely." }) {
  const [stage, setStage] = useState('input'); // 'input' | 'otp' | 'verified'
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timers
  const [resendTimer, setResendTimer] = useState(60);
  const [expiryTimer, setExpiryTimer] = useState(300);

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // Resend Countdown
  useEffect(() => {
    let timer;
    if (stage === 'otp' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, resendTimer]);

  // Expiry Countdown
  useEffect(() => {
    let timer;
    if (stage === 'otp' && expiryTimer > 0) {
      timer = setInterval(() => {
        setExpiryTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, expiryTimer]);

  // Auto focus first box when entering OTP stage
  useEffect(() => {
    if (stage === 'otp') {
      setTimeout(() => {
        if (inputRefs[0].current) {
          inputRefs[0].current.focus();
        }
      }, 100);
    }
  }, [stage]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = (email || '').trim();
    if (!cleanEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return setError('Please enter a valid email address.');
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/send-otp', { email: cleanEmail });
      
      if (res.data.success) {
        setMaskedEmail(res.data.maskedEmail || cleanEmail);
        setSuccessMsg('Verification code sent successfully. Please check your mailbox.');
        setDigits(['', '', '', '', '', '']);
        setResendTimer(60);
        setExpiryTimer(300);
        setStage('otp');
      } else {
        setError(res.data.message || 'Unable to send verification email. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to send verification email. Please check server SMTP configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');

    // Auto advance to next box
    if (value && index < 5 && inputRefs[index + 1].current) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs[index - 1].current) {
        inputRefs[index - 1].current.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const pastedArray = pastedData.split('');
      setDigits(pastedArray);
      if (inputRefs[5].current) {
        inputRefs[5].current.focus();
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      return setError('Please enter all 6 digits of the verification code.');
    }

    setVerifying(true);
    try {
      const res = await axios.post('/api/auth/verify-otp', {
        email: email.trim(),
        otp: otpCode
      });

      if (res.data.success) {
        setStage('verified');
        if (onVerified) onVerified(email.trim());
      } else {
        setError(res.data.message || 'Incorrect verification code. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Incorrect verification code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isOtpComplete = digits.every(d => d !== '');

  return (
    <div className="view-container animate-fade-in" style={{ maxWidth: '520px', margin: '0 auto' }}>
      
      {stage === 'input' && (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="staff@gecm.edu"
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'var(--soft-bg, rgba(0,0,0,0.25))', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-main, white)', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !email.trim()}
            style={{ 
              background: 'var(--color-primary, #3b82f6)', 
              color: 'white', 
              padding: '0.9rem', 
              borderRadius: '10px', 
              border: 'none', 
              cursor: loading || !email.trim() ? 'not-allowed' : 'pointer', 
              fontWeight: '600', 
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: loading || !email.trim() ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)'
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Verification Code'}
          </button>
        </form>
      )}

      {stage === 'otp' && (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
          
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.35rem' }}>Verify Your Email</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              We've sent a 6-digit verification code to
            </p>
            <p style={{ color: 'var(--color-primary, #a78bfa)', fontWeight: '600', fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {maskedEmail}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center' }}>
              {successMsg}
            </div>
          )}

          {/* 6 Digit Input Boxes */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                style={{
                  width: '45px',
                  height: '52px',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  background: 'var(--soft-bg, rgba(0,0,0,0.3))',
                  border: digit ? '2px solid var(--color-primary, #8b5cf6)' : '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: 'var(--text-main, white)',
                  outline: 'none',
                  transition: 'all 0.15s'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>
              {expiryTimer > 0 ? (
                `Code expires in ${formatTimer(expiryTimer)}`
              ) : (
                <span style={{ color: '#ef4444' }}>Code expired. Please resend.</span>
              )}
            </span>

            <button
              type="button"
              disabled={resendTimer > 0 || loading}
              onClick={handleSendOtp}
              style={{
                background: 'transparent',
                border: 'none',
                color: resendTimer > 0 ? 'var(--text-secondary)' : 'var(--color-primary, #8b5cf6)',
                fontWeight: '600',
                cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: resendTimer > 0 ? 0.5 : 1
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => { setStage('input'); setError(''); }}
              style={{
                padding: '0.85rem',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                flex: 1,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              type="submit"
              disabled={!isOtpComplete || verifying || expiryTimer === 0}
              style={{
                padding: '0.85rem',
                background: 'var(--color-primary, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: !isOtpComplete || verifying || expiryTimer === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                flex: 2,
                opacity: !isOtpComplete || verifying || expiryTimer === 0 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {verifying ? <Loader2 size={18} className="animate-spin" /> : 'Verify Email'}
            </button>
          </div>

        </form>
      )}

      {stage === 'verified' && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#10b981',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>Email Verified Successfully!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{email}</p>
        </div>
      )}

    </div>
  );
}
