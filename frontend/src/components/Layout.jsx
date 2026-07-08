import React from 'react';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
