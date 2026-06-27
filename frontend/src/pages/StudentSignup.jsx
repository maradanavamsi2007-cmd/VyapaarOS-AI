import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { UserPlus, Mail, Lock, ShieldAlert } from 'lucide-react';
export default function StudentSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        email,
        password
      };

      const response = await api.studentSignup(payload);
      if (response.success) {
        localStorage.setItem('sansah_student_token', response.token);
        localStorage.setItem('sansah_student_user', JSON.stringify(response.user));
        // Force layout sidebar updates
        window.location.href = '/student/dashboard';
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create account. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          background: 'rgba(17, 25, 40, 0.8)'
        }}
      >
        {/* Top Cyan Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #00f0ff 0%, #00b8d4 100%)',
          color: '#080c14',
          marginBottom: '16px',
          boxShadow: '0 0 16px rgba(0, 240, 255, 0.3)'
        }}>
          <UserPlus size={22} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Create an account
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          Join to register for workshops
        </p>



        {errorMsg && (
          <div style={{
            background: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            fontSize: '13px',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'rgba(255,255,255,0.3)' }}>
                <Mail size={16} />
              </span>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px', height: '44px', background: 'rgba(10, 15, 30, 0.6)' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'rgba(255,255,255,0.3)' }}>
                <Lock size={16} />
              </span>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', height: '44px', background: 'rgba(10, 15, 30, 0.6)' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'rgba(255,255,255,0.3)' }}>
                <Lock size={16} />
              </span>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '40px', height: '44px', background: 'rgba(10, 15, 30, 0.6)' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              marginTop: '12px', 
              height: '44px', 
              background: '#00f0ff', 
              color: '#080c14', 
              fontWeight: '700',
              border: 'none'
            }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          Already have an account? <Link to="/student/login" style={{ color: '#00f0ff', fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>

    </div>
  );
}
