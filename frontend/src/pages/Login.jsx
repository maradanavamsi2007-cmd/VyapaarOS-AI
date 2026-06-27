import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { KeyRound, ShieldAlert, Check } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await api.adminLogin(username, password);
      if (response.success) {
        localStorage.setItem('sansah_admin_token', response.token);
        localStorage.setItem('sansah_admin_user', JSON.stringify(response.user));
        // Force header update by reloading or navigation trigger
        window.location.href = '/admin';
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid username or password credentials.');
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
          maxWidth: '420px',
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
            <KeyRound size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Coordinator Gateway</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sign in to manage registrations and review kits.</p>
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
            <label>Username</label>
            <input 
              type="text" 
              placeholder="e.g. admin" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            {loading ? 'Authorizing...' : 'Access Console'}
          </button>
        </form>

      </div>
    </div>
  );
}
