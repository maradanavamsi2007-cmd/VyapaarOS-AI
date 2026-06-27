import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Award, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Eye, 
  X,
  User,
  GraduationCap,
  Building,
  FileCheck,
  ExternalLink
} from 'lucide-react';

export default function StudentCertificates() {
  const [certificatesData, setCertificatesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('sansah_student_token');
    if (!token) {
      navigate('/student/login');
      return;
    }
    loadCertificates();
  }, [navigate]);

  const loadCertificates = () => {
    setLoading(true);
    api.studentGetCertificates()
      .then(res => {
        setCertificatesData(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching certificates:', err);
        setLoading(false);
      });
  };

  const handlePrint = (code) => {
    window.open(`/certificate/print/${code}`, '_blank');
  };

  const handleVerify = (code) => {
    window.open(`/verify/${code}`, '_blank');
  };

  const handleDownload = async (code) => {
    try {
      const response = await fetch(`/api/certificates/download/${code}`);
      if (!response.ok) {
        const text = await response.text();
        let message = 'Failed to download certificate.';
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || message;
        } catch (_) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate-${code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error occurred while downloading certificate.');
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading your certificates dashboard...</p>;
  }

  // Get student profile details for display
  const studentUser = JSON.parse(localStorage.getItem('sansah_student_user') || '{}');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>My Certificates</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>View, preview, and download your earned coordinator-approved course credentials.</p>
      </div>

      {/* Main Grid List */}
      {certificatesData.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Award size={48} color="var(--text-muted)" style={{ marginBottom: '16px', display: 'inline-block' }} />
          <h4 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>No Registrations Found</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>You must enroll and attend workshops to become eligible for certificates.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {certificatesData.map((item) => {
            const hasCert = !!item.certificate;
            
            return (
              <div 
                key={item.registration_id} 
                className="glass-panel" 
                style={{ 
                  padding: '24px', 
                  borderLeft: `4px solid ${hasCert ? 'var(--success)' : 'var(--border-color)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                
                {/* Upper info line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>{item.workshop_title}</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>Schedule Duration: <strong>{item.duration}</strong></span>
                      <span style={{ color: 'var(--border-color)' }}>|</span>
                      <span>Workshop Status: <strong style={{ color: item.workshop_status === 'Completed' ? 'var(--success)' : 'var(--primary)' }}>{item.workshop_status}</strong></span>
                      <span style={{ color: 'var(--border-color)' }}>|</span>
                      <span>Certificate Status: <strong style={{ color: hasCert ? 'var(--success)' : 'var(--warning)' }}>{hasCert ? 'Issued' : 'Not Issued'}</strong></span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      color: 'var(--text-secondary)'
                    }}>
                      Attendance: <strong>{item.attendance_percentage}%</strong>
                    </span>
                    <span className={`badge ${hasCert ? 'badge-approved' : 'badge-pending'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                      {hasCert ? 'Issued' : 'Not Issued'}
                    </span>
                  </div>
                </div>

                {/* Lower logic block */}
                {hasCert ? (
                  <div style={{ 
                    background: 'var(--success-glow)', 
                    border: '1px solid rgba(16, 185, 129, 0.15)', 
                    padding: '20px', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    {/* Official Banner Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '14px', fontWeight: '700', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '10px' }}>
                      <CheckCircle size={16} />
                      <span>🎉 Congratulations! Your workshop certificate has been issued and is now available for download.</span>
                    </div>

                    {/* Certificate Summary Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '20px' }} className="grid-cols-12">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recipient Student</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {studentUser.name || 'Student Recipient'} <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>[#{item.certificate.student_id}]</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>College & Department</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {studentUser.branch}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {studentUser.semester || 'N/A'} • {studentUser.college_name || 'Sansah College'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workshop Completed</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {item.workshop_title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Duration: {item.duration} ({item.startDate} - {item.endDate})
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credential Credentials</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                            ID: <span style={{ fontFamily: 'monospace' }}>{item.certificate.certificate_code}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Attendance Rate: <strong>{item.attendance_percentage}%</strong> • Issued: {new Date(item.certificate.issue_date).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* QR code rendering box */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)' }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=0d1117&margin=0&data=${encodeURIComponent(
                            `${window.location.origin}/verify/${item.certificate.certificate_code}`
                          )}`} 
                          alt="Verification QR" 
                          style={{ width: '90px', height: '90px' }} 
                        />
                        <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase' }}>Verify Scan</span>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', borderTop: '1px solid rgba(16, 185, 129, 0.15)', paddingTop: '16px' }}>
                      <button 
                        onClick={() => setPreviewCert(item.certificate.certificate_code)}
                        className="btn btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
                      >
                        <Eye size={13} />
                        <span>Preview Certificate</span>
                      </button>
                      <button 
                        onClick={() => handleDownload(item.certificate.certificate_code)}
                        className="btn btn-indigo" 
                        style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
                      >
                        <Download size={13} />
                        <span>Download Certificate</span>
                      </button>
                      <button 
                        onClick={() => handleVerify(item.certificate.certificate_code)}
                        className="btn btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <CheckCircle size={13} color="var(--success)" />
                        <span>Verify Certificate</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)', 
                    padding: '16px', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Why can't I access my certificate?</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {item.eligibility_reason || 'You must satisfy all attendance and approval policies to receive a certificate.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal Overlay */}
      {previewCert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 15, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '20px', backdropFilter: 'blur(10px)'
        }}>
          <div className="glass-panel" style={{ 
            width: '100%', 
            maxWidth: '900px', 
            padding: '0', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.15)'
          }}>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Award size={18} color="var(--primary)" />
                <span>Certificate Preview (Code: {previewCert})</span>
              </h3>
              <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                <button 
                  onClick={() => handlePrint(previewCert)} 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '11px', gap: '4px' }}
                >
                  <Download size={11} /> Print PDF
                </button>
                <button 
                  onClick={() => setPreviewCert(null)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Embedded Iframe of print layout for high fidelity representation */}
            <div style={{ background: '#070a13', display: 'flex', justifyContent: 'center', padding: '16px', overflow: 'hidden' }}>
              <iframe 
                src={`/certificate/print/${previewCert}?preview=true`}
                style={{
                  width: '100%',
                  height: '480px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'white'
                }}
                title="Certificate Canvas Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
