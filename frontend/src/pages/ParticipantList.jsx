import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Search, Eye, Filter, Edit, RefreshCw } from 'lucide-react';

export default function ParticipantList() {
  const [registrations, setRegistrations] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [confirmationFilter, setConfirmationFilter] = useState('');

  useEffect(() => {
    // Authenticate Session
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Load Workshops list for dropdown
    api.getWorkshops()
      .then(res => setWorkshops(res.data || []))
      .catch(err => console.error('Error loading workshops:', err));

    loadRegistrations();
  }, [navigate]);

  const loadRegistrations = () => {
    setLoading(true);
    const filters = {
      search,
      workshop: workshopFilter,
      paymentStatus: paymentFilter,
      confirmationStatus: confirmationFilter
    };

    api.getAllRegistrations(filters)
      .then(res => {
        setRegistrations(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching registrations:', err);
        setLoading(false);
      });
  };

  // Trigger search on form submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRegistrations();
  };

  // Quick Inline Status Update handlers
  const handleUpdateStatus = async (id, status) => {
    const confirmChange = window.confirm(`Are you sure you want to update verification status to ${status}?`);
    if (!confirmChange) return;

    try {
      await api.updateRegistrationStatus(id, status, `Updated inline via participant console.`);
      loadRegistrations();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleUpdatePayment = async (id, status) => {
    const confirmChange = window.confirm(`Update payment status to ${status}?`);
    if (!confirmChange) return;

    try {
      await api.updatePaymentStatus(id, status, `Payment updated inline via participant console.`);
      loadRegistrations();
    } catch (err) {
      alert(err.message || 'Failed to update payment status.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>Participant Audits</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Verify student profiles, group codes, payment references, and project scores.</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr auto', gap: '16px', alignItems: 'end' }} className="grid-cols-12">
          <div>
            <label style={{ fontSize: '11px' }}>Search Student / College / Email</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="e.g. Rahul..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px' }}>Workshop Topic</label>
            <select value={workshopFilter} onChange={(e) => setWorkshopFilter(e.target.value)}>
              <option value="">All Topics</option>
              {workshops.map(w => (
                <option key={w.workshop_id} value={w.workshop_id}>{w.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px' }}>Payment Status</label>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px' }}>Verify Status</label>
            <select value={confirmationFilter} onChange={(e) => setConfirmationFilter(e.target.value)}>
              <option value="">All Verification</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
              Filter
            </button>
            <button 
              type="button" 
              onClick={() => {
                setSearch('');
                setWorkshopFilter('');
                setPaymentFilter('');
                setConfirmationFilter('');
                // Let state clear first, then fetch
                setTimeout(() => loadRegistrations(), 50);
              }} 
              className="btn btn-secondary" 
              style={{ padding: '12px' }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table grid */}
      <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>Querying participant database...</p>
        ) : registrations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>No registrations match the selected criteria.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Reg ID</th>
                  <th>Date</th>
                  <th>Student Name</th>
                  <th>College Name</th>
                  <th>Workshop</th>
                  <th>Payment</th>
                  <th>Verification</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => (
                  <tr key={reg.registration_id}>
                    <td>
                      <code style={{ color: 'var(--primary)', fontWeight: '600' }}>#{reg.registration_id}</code>
                    </td>
                    <td>{formatDate(reg.registration_date)}</td>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{reg.student_name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{reg.student_email}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{reg.college_name}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{reg.workshop_title}</span>
                    </td>
                    <td>
                      <select 
                        value={reg.payment_status} 
                        onChange={(e) => handleUpdatePayment(reg.registration_id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '11px', width: 'auto', background: 'transparent' }}
                      >
                        <option value="Pending" style={{ color: '#000' }}>Pending</option>
                        <option value="Completed" style={{ color: '#000' }}>Completed</option>
                        <option value="Refunded" style={{ color: '#000' }}>Refunded</option>
                      </select>
                    </td>
                    <td>
                      <select 
                        value={reg.confirmation_status} 
                        onChange={(e) => handleUpdateStatus(reg.registration_id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '11px', width: 'auto', background: 'transparent' }}
                      >
                        <option value="Pending" style={{ color: '#000' }}>Pending</option>
                        <option value="Approved" style={{ color: '#000' }}>Approved</option>
                        <option value="Rejected" style={{ color: '#000' }}>Rejected</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/registrations/${reg.registration_id}`} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
                      >
                        <Eye size={12} />
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
