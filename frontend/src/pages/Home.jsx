import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Cpu, 
  Terminal, 
  Layers, 
  Workflow, 
  Home as HomeIcon, 
  ChevronRight,
  BrainCircuit,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function Home() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recommendation advisor state
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('Semester 3');
  const [interests, setInterests] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    api.getWorkshops()
      .then(res => {
        setWorkshops(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching workshops:', err);
        setLoading(false);
      });
  }, []);

  const handleGetRecommendation = async (e) => {
    e.preventDefault();
    if (!branch) return;
    setLoadingRec(true);
    setRecommendation('');

    try {
      const res = await api.getRecommendations(branch, semester, interests);
      setRecommendation(res.data);
    } catch (err) {
      setRecommendation('Failed to generate recommendations. Please try again.');
    } finally {
      setLoadingRec(false);
    }
  };

  // Helper to map workshop icon
  const getIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('iot') || t.includes('internet')) return <Cpu size={24} color="var(--primary)" />;
    if (t.includes('embedded')) return <Terminal size={24} color="var(--secondary)" />;
    if (t.includes('pcb')) return <Layers size={24} color="var(--accent-purple)" />;
    if (t.includes('robot')) return <Workflow size={24} color="var(--success)" />;
    return <HomeIcon size={24} color="var(--warning)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* Hero section */}
      <section style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.03)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--primary-glow)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '9999px', marginBottom: '24px' }}>
          <Sparkles size={14} color="var(--primary)" />
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', letterSpacing: '0.05em' }}>SANSAH INNOVATIONS ACADEMY</span>
        </div>
        
        <h1 style={{ fontSize: '42px', fontWeight: '800', marginBottom: '16px', lineHeight: '1.2' }}>
          Empower Your Career with <br />
          <span className="gradient-text">Hands-On Technical Workshops</span>
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 32px auto', fontSize: '16px', lineHeight: '1.6' }}>
          Industry-accredited, lab-oriented engineering bootcamps for IoT, Embedded Systems, PCB Design, Robotics, and Smart Home Automation.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }}>
            <span>Register for a Workshop</span>
            <ChevronRight size={16} />
          </Link>
          <a href="#advisor" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '15px' }}>
            <span>Try AI Recommendation</span>
          </a>
        </div>
      </section>

      {/* Catalog section */}
      <section>
        <h2 style={{ fontSize: '24px', marginBottom: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Explore Workshop Topics</span>
          <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>({workshops.length} modules available)</span>
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading catalog...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {workshops.map((w) => {
              const isFull = w.status === 'Full';
              const isSuspended = w.status === 'Suspended';
              
              return (
                <div 
                  key={w.workshop_id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '24px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    gap: '20px',
                    opacity: isSuspended ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        {getIcon(w.title)}
                      </div>
                      <span className={`badge ${
                        w.status === 'Active' ? 'badge-approved' : 
                        w.status === 'Full' ? 'badge-pending' : 'badge-rejected'
                      }`}>
                        {w.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{w.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', minHeight: '60px' }}>{w.description}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Lead Trainer:</span>
                      <span style={{ fontWeight: '500' }}>{w.trainer_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Enrolled Slots:</span>
                      <span>{w.current_registrations} / {w.capacity}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                      <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>INR {w.fee}</span>
                      {!(isFull || isSuspended) && (
                        <Link to="/register" style={{ fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <span>Enroll Now</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AI Advisor widget */}
      <section id="advisor" style={{ scrollMarginTop: '100px' }}>
        <div 
          className="glass-panel" 
          style={{ 
            padding: '32px',
            background: 'linear-gradient(135deg, rgba(17,25,40,0.85) 0%, rgba(10,15,30,0.95) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.15)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <BrainCircuit size={28} color="var(--primary)" className="pulse-glow" />
            <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-display)' }}>Sansah AI - Workshop Advisor</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '650px', lineHeight: '1.6' }}>
            Unsure which technology stack suits your academic department or career goal? Input your details below, and our recommendation engine will select matching programs.
          </p>

          <form onSubmit={handleGetRecommendation} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: '16px', alignItems: 'end' }} className="grid-cols-12">
            <div>
              <label>Academic Branch</label>
              <input 
                type="text" 
                placeholder="e.g. Computer Science" 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 7">Semester 7</option>
              </select>
            </div>
            <div>
              <label>Personal Interests / Skills</label>
              <input 
                type="text" 
                placeholder="e.g. C++, sensors, web design" 
                value={interests} 
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
            <div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px 16px' }}
                disabled={loadingRec}
              >
                {loadingRec ? '...' : <Sparkles size={16} />}
              </button>
            </div>
          </form>

          {recommendation && (
            <div 
              className="glass-panel" 
              style={{ 
                marginTop: '24px', 
                padding: '20px', 
                background: 'rgba(0,0,0,0.3)', 
                borderColor: 'rgba(0,240,255,0.1)'
              }}
            >
              <h4 style={{ color: 'var(--primary)', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} />
                <span>AI Recommendations:</span>
              </h4>
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {recommendation.split('\n').map((line, idx) => (
                  <p key={idx} style={{ marginBottom: '8px' }}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Brand value statement cards */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }} className="grid-cols-12">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <UserCheck size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Lab Centric Learning</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Skip boring slide shows. Learn via real-time code execution, breadboard designs, and active hardware tests.</p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <Sparkles size={32} color="var(--secondary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Industry Grade Kits</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Each group registration receives complete component kits including NodeMCU, Arduino, sensors, and servos.</p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <Layers size={32} color="var(--accent-purple)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Certificate & Hosting</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Pass lab assessments to receive secure verifiably issued completion credentials hosted under Sansah Cloud.</p>
        </div>
      </section>

    </div>
  );
}
