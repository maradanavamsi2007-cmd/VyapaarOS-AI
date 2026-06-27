import React, { useState } from 'react';
import { X, Copy, Check, RefreshCw } from 'lucide-react';

export default function AISummaryModal({ isOpen, onClose, title, content, loading, onRegenerate }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format line breaks and bullet points into HTML
  const renderFormattedContent = (txt) => {
    if (!txt) return null;
    return txt.split('\n').map((line, idx) => {
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return <li key={idx} style={{ marginLeft: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>{line.replace(/^[\*\-]\s*/, '')}</li>;
      }
      if (line.trim().startsWith('### ')) {
        return <h4 key={idx} style={{ marginTop: '20px', marginBottom: '10px', color: 'var(--primary)', fontWeight: '600' }}>{line.replace('### ', '')}</h4>;
      }
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        return <strong key={idx} style={{ display: 'block', margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>{line.replace(/\*\*/g, '')}</strong>;
      }
      if (line.trim() === '') {
        return <br key={idx} />;
      }
      return <p key={idx} style={{ marginBottom: '12px', lineHeight: '1.6', color: 'var(--text-primary)' }}>{line}</p>;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{title}</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Box */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          minHeight: '200px'
        }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <RefreshCw className="pulse-glow" size={36} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Invoking Sansah Intelligence Engine...</p>
            </div>
          ) : (
            <div style={{ fontSize: '14px', textAlign: 'left' }}>
              {renderFormattedContent(content)}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        {!loading && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            {onRegenerate && (
              <button 
                onClick={onRegenerate}
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                <RefreshCw size={14} />
                <span>Regenerate</span>
              </button>
            )}
            <button 
              onClick={handleCopy}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '8px 16px', minWidth: '110px' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
