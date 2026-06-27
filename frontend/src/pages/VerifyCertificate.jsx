import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Award, 
  User, 
  Calendar, 
  BookOpen, 
  Building,
  CheckCircle,
  FileCheck
} from 'lucide-react';

export default function VerifyCertificate() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code');
  
  const [certCode, setCertCode] = useState(code || queryCode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // If code is in url parameters, run verification automatically
    const targetCode = code || queryCode;
    if (targetCode) {
      verifyCode(targetCode);
    }
  }, [code, queryCode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!certCode.trim()) return;
    verifyCode(certCode.trim());
  };

  const verifyCode = (codeToVerify) => {
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    api.verifyCertificate(codeToVerify)
      .then(res => {
        setResult(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Verification error:', err);
        setErrorMsg(err.message || 'Certificate verification failed. Ensure the code is valid.');
        setLoading(false);
      });
  };

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Award size={32} color="var(--primary)" className="pulse-glow" />
          <span>Credential Registry</span>
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Sansah Innovations Public Certificate Verification Gateway. Check authenticity of workshop credentials.
        </p>
      </div>

      {/* Manual lookup input */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Enter Certificate Code or ID</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="e.g. SANSAH-WS-654321" 
                value={certCode}
                onChange={(e) => setCertCode(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={loading}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !certCode.trim()}
              style={{ width: 'auto', padding: '0 24px' }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Validating certificate code in database records...</p>
      )}

      {/* Error state */}
      {errorMsg && (
        <div className="glass-panel" style={{ 
          padding: '24px', 
          borderColor: 'rgba(239, 68, 68, 0.2)', 
          background: 'rgba(239, 68, 68, 0.02)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '12px',
          textAlign: 'center' 
        }}>
          <ShieldAlert size={48} color="var(--danger)" />
          <div>
            <h4 style={{ fontSize: '16px', color: 'var(--danger)', margin: '0 0 6px 0' }}>VERIFICATION FAILED</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              The credential ID or code <strong style={{ color: 'var(--text-primary)' }}>"{certCode}"</strong> is either invalid, has been modified, or was revoked due to ineligibility.
            </p>
          </div>
        </div>
      )}

      {/* Result verified state */}
      {result && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '28px',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.02) 0%, rgba(9,28,21,0.4) 100%)',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.1)'
          }}
        >
          {/* Top Verified Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '24px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)'
            }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700', letterSpacing: '0.05em' }}>OFFICIAL VERIFIED CREDENTIAL</div>
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>Status: {result.verification_status}</h3>
            </div>
          </div>

          {/* Details list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <User size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Student Name (ID)</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {result.student_name} <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>[#{result.student_id}]</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Building size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>College / Affiliation</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{result.college_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{result.university_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {result.department} | {result.year_of_study}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <BookOpen size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed Workshop Program</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{result.workshop_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Duration: {result.workshop_duration} ({result.workshop_start_date} - {result.workshop_end_date})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <FileCheck size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attendance & Issue Details</div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  Presence record: <strong style={{ color: 'var(--success)' }}>{result.attendance_percentage}%</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Credential ID: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{result.certificate_code}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Date of Issue: {new Date(result.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
