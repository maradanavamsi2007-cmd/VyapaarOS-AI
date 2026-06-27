import React from 'react';
import RegistrationForm from '../components/RegistrationForm';
import { HelpCircle } from 'lucide-react';

export default function Register() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
          Workshop Enrollment
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          Fill in your details below to secure seats, reserve workshop toolkits, and receive confirmation guidelines.
        </p>
      </div>

      <RegistrationForm />

      <div 
        className="glass-panel" 
        style={{ 
          maxWidth: '750px', 
          margin: '0 auto', 
          padding: '20px', 
          display: 'flex', 
          gap: '16px', 
          alignItems: 'start',
          background: 'rgba(255,255,255,0.01)'
        }}
      >
        <HelpCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>Need assistance with institutional payments?</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            If your college is sponsoring registrations or you need a custom invoice header, please do not pay online. Register as "Pending" and contact our coordinators to set up bank transfers.
          </p>
        </div>
      </div>
    </div>
  );
}
