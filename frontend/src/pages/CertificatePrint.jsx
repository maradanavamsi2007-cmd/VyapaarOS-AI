import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Award, Printer, ShieldAlert } from 'lucide-react';

export default function CertificatePrint() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const queryCodes = searchParams.get('codes');

  const [loading, setLoading] = useState(true);
  const [certsList, setCertsList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let targetCodes = [];
    if (code && code !== 'bulk') {
      targetCodes = [code];
    } else if (queryCodes) {
      targetCodes = queryCodes.split(',').map(c => c.trim()).filter(Boolean);
    }

    if (targetCodes.length === 0) {
      setErrorMsg('No certificate codes provided for printing.');
      setLoading(false);
      return;
    }

    // Fetch verification details for all target codes in parallel
    Promise.all(targetCodes.map(c => api.verifyCertificate(c)))
      .then(responses => {
        const dataList = responses.map(res => res.data);
        setCertsList(dataList);
        setLoading(false);
        
        // Trigger automatic print dialog if not in preview mode
        if (!isPreview) {
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      })
      .catch(err => {
        console.error('Error fetching printable certificates:', err);
        setErrorMsg(err.message || 'Failed to load certificate printable content. Verify that all codes are valid.');
        setLoading(false);
      });
  }, [code, queryCodes, isPreview]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#666', background: '#fafafa' }}>
        <p>Generating high-fidelity certificate rendering...</p>
      </div>
    );
  }

  if (errorMsg || certsList.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', background: '#fafafa', minHeight: '100vh' }}>
        <ShieldAlert size={48} style={{ margin: '0 auto 12px auto' }} />
        <h3>Print Rendering Failed</h3>
        <p>{errorMsg || 'Invalid certificate data.'}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#e0e0e0', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: isPreview ? '0' : '20px 0',
      gap: '24px'
    }}>
      
      {/* Floating Action Bar (Hidden during Print) */}
      {!isPreview && (
        <div className="no-print" style={{ 
          width: '100%', 
          maxWidth: '1050px', 
          background: 'rgba(15, 23, 42, 0.9)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px 24px', 
          borderRadius: '8px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          color: '#f8fafc',
          backdropFilter: 'blur(8px)'
        }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              Workshop Completion Certificate ({certsList.length} ready)
            </span>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Printer settings: Layout = **Landscape**, Margins = **None**, Background Graphics = **Checked**.
            </p>
          </div>
          <button 
            onClick={() => window.print()} 
            className="btn btn-indigo" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '8px 16px', fontSize: '12px' }}
          >
            <Printer size={13} />
            <span>Print or Export PDF</span>
          </button>
        </div>
      )}

      {/* Renders each certificate as a separate page */}
      {certsList.map((certData, index) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0d1117&margin=0&data=${encodeURIComponent(
          `${window.location.origin}/verify/${certData.certificate_code}`
        )}`;

        return (
          <div 
            key={certData.certificate_id}
            className="certificate-page-canvas" 
            style={{
              width: '297mm',
              height: '210mm',
              background: '#fff',
              boxShadow: isPreview ? 'none' : '0 10px 30px rgba(0,0,0,0.15)',
              borderRadius: isPreview ? '0' : '4px',
              boxSizing: 'border-box',
              padding: '20mm',
              position: 'relative',
              color: '#1e293b',
              fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
              pageBreakAfter: index < certsList.length - 1 ? 'always' : 'auto'
            }}
          >
            
            {/* Certificate Outer Border */}
            <div style={{
              position: 'absolute',
              top: '8mm', left: '8mm', right: '8mm', bottom: '8mm',
              border: '4px double #d4af37',
              pointerEvents: 'none'
            }} />

            {/* Certificate Inner Border */}
            <div style={{
              position: 'absolute',
              top: '11mm', left: '11mm', right: '11mm', bottom: '11mm',
              border: '1px solid #c5a02e',
              pointerEvents: 'none'
            }} />

            {/* Corner Decorative Ornaments */}
            <div style={{
              position: 'absolute',
              top: '11mm', left: '11mm',
              width: '24px', height: '24px',
              borderTop: '5px solid #d4af37',
              borderLeft: '5px solid #d4af37',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              top: '11mm', right: '11mm',
              width: '24px', height: '24px',
              borderTop: '5px solid #d4af37',
              borderRight: '5px solid #d4af37',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '11mm', left: '11mm',
              width: '24px', height: '24px',
              borderBottom: '5px solid #d4af37',
              borderLeft: '5px solid #d4af37',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '11mm', right: '11mm',
              width: '24px', height: '24px',
              borderBottom: '5px solid #d4af37',
              borderRight: '5px solid #d4af37',
              pointerEvents: 'none'
            }} />

            {/* --- CONTENT START --- */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', textAlign: 'center' }}>
              
              {/* Header Organization Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4mm' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={32} color="#c5a02e" />
                  <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '0.15em', color: '#0f172a' }}>SANSAH INNOVATIONS</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.2em', color: '#64748b' }}>CENTER FOR ACADEMIC RESEARCH & TECHNOLOGY</span>
              </div>

              {/* Certificate Title */}
              <div>
                <h1 style={{ 
                  fontSize: '38px', 
                  fontFamily: "'Playfair Display', serif", 
                  fontWeight: '700', 
                  color: '#1e3a8a', 
                  letterSpacing: '0.04em',
                  margin: '0 0 6px 0'
                }}>
                  Certificate of Completion
                </h1>
                <div style={{ width: '120px', height: '2px', background: '#c5a02e', margin: '0 auto' }} />
              </div>

              {/* Body Certify Statement Text */}
              <div style={{ padding: '0 40px', lineHeight: '1.8' }}>
                <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#475569', margin: '0 0 8px 0' }}>
                  This is to certify that
                </p>
                <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0', borderBottom: '1px solid #e2e8f0', display: 'inline-block', paddingBottom: '4px', minWidth: '320px' }}>
                  {certData.student_name}
                </h2>
                <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>
                  from <strong>{certData.college_name}</strong>, Department of <strong>{certData.department}</strong>, has successfully completed the <strong>{certData.workshop_name}</strong> workshop with an attendance of <strong>{certData.attendance_percentage}%</strong>. We appreciate their dedication and participation.
                </p>
              </div>

              {/* Footer block: Signatures, Seal and QR verification */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 40px', marginBottom: '4mm' }}>
                
                {/* Signature 1 */}
                <div style={{ textAlign: 'center', width: '150px' }}>
                  <div style={{ fontStyle: 'italic', fontFamily: "'Dancing Script', cursive", fontSize: '18px', color: '#1e3a8a', minHeight: '30px' }}>
                    Dr. Amit Varma
                  </div>
                  <div style={{ width: '100%', height: '1px', background: '#94a3b8', margin: '6px 0' }} />
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Coordinator, Sansah</span>
                </div>

                {/* Verification QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <img 
                    src={qrUrl} 
                    alt="Verification QR" 
                    style={{ width: '80px', height: '80px', border: '1px solid #e2e8f0', padding: '4px', background: 'white' }} 
                  />
                  <span style={{ fontSize: '8px', color: '#64748b', fontFamily: 'monospace' }}>SCAN TO VERIFY</span>
                </div>

                {/* Signature 2 */}
                <div style={{ textAlign: 'center', width: '150px' }}>
                  <div style={{ fontStyle: 'italic', fontFamily: "'Dancing Script', cursive", fontSize: '18px', color: '#1e3a8a', minHeight: '30px' }}>
                    Priyadarshini S.
                  </div>
                  <div style={{ width: '100%', height: '1px', background: '#94a3b8', margin: '6px 0' }} />
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Lead Instructor</span>
                </div>

              </div>

              {/* Bottom Metadatas */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', padding: '0 40px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <span>CREDENTIAL ID: <strong style={{ color: '#334155' }}>{certData.certificate_code}</strong></span>
                <span>VERIFIED STATUS: <strong style={{ color: 'var(--success)' }}>{certData.verification_status}</strong></span>
                <span>ISSUE DATE: <strong style={{ color: '#334155' }}>{new Date(certData.issue_date).toLocaleDateString('en-IN')}</strong></span>
              </div>

            </div>

          </div>
        );
      })}

      {/* Styled print rules injected to page */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html, #root {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .certificate-page-canvas {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20mm !important;
            border-radius: 0 !important;
            transform: none !important;
            page-break-after: always !important;
          }
          .certificate-page-canvas:last-child {
            page-break-after: avoid !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}} />

    </div>
  );
}
