import React from 'react';

export default function StatsCard({ title, value, icon: Icon, color = 'var(--primary)', description = '' }) {
  return (
    <div 
      className="glass-panel" 
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background soft glow */}
      <div 
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          background: color,
          opacity: 0.08,
          borderRadius: '50%',
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>{title}</span>
        <div 
          style={{
            background: `rgba(255, 255, 255, 0.03)`,
            border: `1px solid ${color}33`,
            borderRadius: '8px',
            padding: '8px',
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {value}
        </span>
      </div>

      {description && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {description}
        </span>
      )}
    </div>
  );
}
