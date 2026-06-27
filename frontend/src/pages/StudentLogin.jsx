import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { GraduationCap, ShieldAlert, Check } from 'lucide-react';
export default function StudentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await api.studentLogin(email, password);
      if (response.success) {
        localStorage.setItem('sansah_student_token', response.token);
        localStorage.setItem('sansah_student_user', JSON.stringify(response.user));
        // Force layout reload to update sidebar menu options
        window.location.href = '/student/dashboard';
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div 
        className="glass-panel animate-float"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 32px',
          position: 'relative'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            background: 'var(--primary-glow)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '50%',
            color: 'var(--primary)',
            marginBottom: '16px'
          }}>
            <GraduationCap size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Student Gateway</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Log in to view enrollments, attendance, and certificates.</p>
        </div>



        {errorMsg && (
          <div style={{
            background: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            fontSize: '13px',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label>Registered Email</label>
            <input 
              type="email" 
              placeholder="e.g. rahul.sharma@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px', height: '45px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            New student? <Link to="/student/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Create Account</Link>
          </p>
        </div>
      </div>

    </div>
  );
}
