import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import StatsCard from '../components/StatsCard';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  HelpCircle, 
  School, 
  Cpu, 
  TrendingUp, 
  ArrowRight,
  Settings,
  ShieldCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Authenticate Admin Session
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = () => {
    setLoading(true);
    api.getDashboardStats()
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard stats:', err);
        setLoading(false);
      });
  };

  const handleWorkshopStatusChange = async (wId, newStatus) => {
    setStatusUpdating(prev => ({ ...prev, [wId]: true }));
    try {
      await api.updateWorkshopStatus(wId, newStatus);
      // Reload stats to reflect updated slots/status
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update workshop status');
    } finally {
      setStatusUpdating(prev => ({ ...prev, [wId]: false }));
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading Dashboard Analytics...</p>;
  }

  const { summary, workshops, colleges } = stats || { summary: {}, workshops: [], colleges: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>Console Overview</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Real-time student allocations and workshop statistics.</p>
        </div>
        <button 
          onClick={loadDashboardData} 
          className="btn btn-secondary" 
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }} className="grid-cols-12">
        <StatsCard 
          title="Total Submissions" 
          value={summary.total || 0} 
          icon={Users} 
          color="var(--primary)" 
          description="Total online entries logged"
        />
        <StatsCard 
          title="Approved Seats" 
          value={summary.approved || 0} 
          icon={CheckCircle} 
          color="var(--success)" 
          description="Verified seats allocated"
        />
        <StatsCard 
          title="Pending Audits" 
          value={summary.pending || 0} 
          icon={Clock} 
          color="var(--warning)" 
          description="Entries awaiting review"
        />
        <StatsCard 
          title="Rejections" 
          value={summary.rejected || 0} 
          icon={HelpCircle} 
          color="var(--danger)" 
          description="Disqualified entries"
        />
      </div>

      {/* Main Grid: Workshops Manager & College Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }} className="grid-cols-12">
        
        {/* Workshops Controller Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--primary)" />
            <span>Workshop Allocations & Statuses</span>
          </h3>

          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Capacity</th>
                  <th>Enrollments</th>
                  <th>Status Control</th>
                </tr>
              </thead>
              <tbody>
                {workshops.map(w => (
                  <tr key={w.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{w.title}</strong>
                    </td>
                    <td>{w.capacity} seats</td>
                    <td>
                      <span style={{ fontWeight: '600', color: w.count >= w.capacity ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {w.count}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={w.status} 
                        onChange={(e) => handleWorkshopStatusChange(w.id, e.target.value)}
                        disabled={statusUpdating[w.id]}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '12px', 
                          width: 'auto',
                          borderColor: 
                            w.status === 'Active' ? 'var(--success)' : 
                            w.status === 'Full' ? 'var(--warning)' : 'var(--danger)'
                        }}
                      >
                        <option value="Active">Active</option>
                        <option value="Full">Full</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: Top Colleges and Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Colleges list */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <School size={18} color="var(--secondary)" />
              <span>Top Campuses</span>
            </h3>

            {colleges.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No campus data available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {colleges.map((col, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflow: 'hidden' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: '600' }}>#{idx+1}</span>
                      <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '180px' }}>{col.name}</span>
                    </div>
                    <span style={{ background: 'var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                      {col.count} regs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} color="var(--primary)" />
              <span>Console Shortcuts</span>
            </h3>
            
            <Link to="/participants" className="btn btn-primary" style={{ width: '100%', fontSize: '13px', padding: '10px' }}>
              <span>Review Participants</span>
              <ArrowRight size={14} />
            </Link>
            
            <Link to="/reports" className="btn btn-secondary" style={{ width: '100%', fontSize: '13px', padding: '10px' }}>
              <span>Export CSV & Reports</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
