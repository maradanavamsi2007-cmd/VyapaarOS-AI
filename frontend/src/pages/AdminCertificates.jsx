import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Award, 
  Search, 
  RefreshCw, 
  Printer, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export default function AdminCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Bulk Selection
  const [selectedRegIds, setSelectedRegIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadCertificates();
  }, [navigate, statusFilter]);

  const loadCertificates = () => {
    setLoading(true);
    api.adminGetCertificates(search, statusFilter)
      .then(res => {
        setCertificates(res.data || []);
        setSelectedRegIds([]); // Reset selection
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching admin certificates list:', err);
        setLoading(false);
      });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCertificates();
  };

  const handleRegenerate = async (regId) => {
    try {
      const res = await api.adminRegenerateCertificate(regId);
      alert(res.message || 'Certificate evaluation processed successfully.');
      loadCertificates();
    } catch (err) {
      alert(err.message || 'Failed to process certificate regeneration.');
    }
  };

  const handleIssue = async (regId) => {
    try {
      const res = await api.adminIssueCertificate(regId);
      alert(res.message || 'Certificate successfully issued.');
      loadCertificates();
    } catch (err) {
      alert(err.message || 'Failed to issue certificate.');
    }
  };

  const handleRevoke = async (regId) => {
    if (!window.confirm('Are you sure you want to revoke this certificate? The student will no longer be able to download it.')) {
      return;
    }
    try {
      const res = await api.adminRevokeCertificate(regId);
      alert(res.message || 'Certificate successfully revoked.');
      loadCertificates();
    } catch (err) {
      alert(err.message || 'Failed to revoke certificate.');
    }
  };

  const handleReissue = async (regId) => {
    if (!window.confirm('Are you sure you want to reissue this certificate? This will update the issue date to today.')) {
      return;
    }
    try {
      const res = await api.adminReissueCertificate(regId);
      alert(res.message || 'Certificate successfully reissued.');
      loadCertificates();
    } catch (err) {
      alert(err.message || 'Failed to reissue certificate.');
    }
  };

  const handlePrintSingle = (code) => {
    window.open(`/certificate/print/${code}`, '_blank');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select only issued certificates from the list
      const issuedList = certificates.filter(c => c.certificate_status === 'Issued');
      setSelectedRegIds(issuedList.map(c => c.registration_id));
    } else {
      setSelectedRegIds([]);
    }
  };

  const handleSelectRow = (regId) => {
    setSelectedRegIds(prev => 
      prev.includes(regId) 
        ? prev.filter(id => id !== regId) 
        : [...prev, regId]
    );
  };

  const handleBulkPrint = () => {
    if (selectedRegIds.length === 0) return;
    
    // Get certificate codes for selected registrations
    const selectedCerts = certificates.filter(c => selectedRegIds.includes(c.registration_id) && c.certificate_code);
    const codes = selectedCerts.map(c => c.certificate_code).join(',');
    
    if (!codes) {
      alert('Selected registrations do not have issued certificates.');
      return;
    }
    
    window.open(`/certificate/print/bulk?codes=${codes}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>Certificate Registry</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Review eligible students, approve and issue certificate credentials, or revoke existing ones.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={loadCertificates} 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px' }}
            title="Refresh list"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 240px auto', gap: '16px', alignItems: 'end' }} className="grid-cols-12">
          <div>
            <label style={{ fontSize: '11px' }}>Search Student / College / Department / Certificate</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search name, email, department, college, code..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px' }}>Filter Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Registrations</option>
              <option value="Issued">Issued</option>
              <option value="Eligible for Certificate">Eligible for Certificate</option>
              <option value="Not Eligible">Not Eligible</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ padding: '12px 24px', width: 'auto' }}
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Bulk Print Actions Bar */}
      {selectedRegIds.length > 0 && (
        <div style={{ 
          background: 'rgba(99, 102, 241, 0.1)', 
          border: '1px solid rgba(99, 102, 241, 0.25)', 
          padding: '12px 20px', 
          borderRadius: '8px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            <strong>{selectedRegIds.length}</strong> certificates selected for batch operations.
          </span>
          <button 
            onClick={handleBulkPrint} 
            className="btn btn-indigo"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '12px', width: 'auto' }}
          >
            <Printer size={13} />
            <span>Bulk Print Certificates</span>
          </button>
        </div>
      )}

      {/* Main Registry Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>Loading certificate registry...</p>
        ) : certificates.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>No registrations found matching the criteria.</p>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '13px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={
                        selectedRegIds.length === certificates.filter(c => c.certificate_status === 'Issued').length && 
                        certificates.filter(c => c.certificate_status === 'Issued').length > 0
                      }
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </th>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Department / College</th>
                  <th>Workshop</th>
                  <th>Attendance %</th>
                  <th>Verification</th>
                  <th>Certificate Status</th>
                  <th>Certificate Code</th>
                  <th style={{ textAlign: 'right', minWidth: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((row) => {
                  const isSelected = selectedRegIds.includes(row.registration_id);
                  const isIssued = row.certificate_status === 'Issued';
                  const isEligible = row.certificate_status === 'Eligible for Certificate';
                  
                  let statusBadgeColor = 'badge-rejected';
                  if (isIssued) statusBadgeColor = 'badge-approved';
                  else if (isEligible) statusBadgeColor = 'badge-pending';

                  return (
                    <tr key={row.registration_id} style={{ background: isSelected ? 'rgba(99,102,241,0.02)' : 'transparent' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          disabled={!isIssued}
                          checked={isSelected}
                          onChange={() => handleSelectRow(row.registration_id)}
                          style={{ width: '16px', height: '16px', cursor: !isIssued ? 'not-allowed' : 'pointer' }}
                        />
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>#{row.student_id}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{row.student_name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.student_email}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{row.department}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', maxWidth: '160px', overflow: 'hidden', whiteSpace: 'nowrap' }} title={row.college_name}>
                            {row.college_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{row.workshop_title}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Workshop: {row.workshop_status}</span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: row.attendance_percentage >= 90 ? 'var(--success)' : 'var(--text-primary)' }}>
                          {row.attendance_percentage}%
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${row.confirmation_status === 'Approved' ? 'badge-approved' : 'badge-pending'}`}>
                          {row.confirmation_status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isIssued ? 'badge-approved' : 'badge-pending'}`}>
                          {isIssued ? 'Issued' : 'Not Issued'}
                        </span>
                      </td>
                      <td>
                        {row.certificate_code ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {row.certificate_code}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Issued</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          
                           {isIssued ? (
                             <button
                               disabled
                               className="btn btn-primary"
                               style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'not-allowed' }}
                             >
                               <span>Certificate Already Issued</span>
                             </button>
                           ) : (
                             <button
                               onClick={() => handleIssue(row.registration_id)}
                               disabled={!isEligible}
                               className="btn btn-primary"
                               style={{
                                 padding: '6px 12px',
                                 fontSize: '11px',
                                 background: isEligible ? 'var(--success)' : 'rgba(255, 255, 255, 0.02)',
                                 color: isEligible ? 'white' : 'var(--text-muted)',
                                 border: isEligible ? 'none' : '1px solid var(--border-color)',
                                 cursor: isEligible ? 'pointer' : 'not-allowed'
                               }}
                             >
                               <span>Issue Certificate</span>
                             </button>
                           )}

                          {isIssued && (
                            <>
                              <button
                                onClick={() => handlePrintSingle(row.certificate_code)}
                                className="btn btn-primary"
                                style={{ padding: '6px 10px', fontSize: '11px', gap: '4px' }}
                                title="Print/Download certificate PDF"
                              >
                                <Printer size={11} />
                                <span>Print</span>
                              </button>
                              <button
                                onClick={() => handleReissue(row.registration_id)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '11px', border: '1px solid var(--border-color)' }}
                                title="Reissue certificate"
                              >
                                <span>Reissue</span>
                              </button>
                              <button
                                onClick={() => handleRevoke(row.registration_id)}
                                className="btn btn-danger"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                                title="Revoke certificate"
                              >
                                <span>Revoke</span>
                              </button>
                            </>
                          )}

                          {!isIssued && (
                            <button
                              onClick={() => handleRegenerate(row.registration_id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '11px', gap: '4px', border: '1px solid var(--border-color)' }}
                              title="Recalculate eligibility rules and auto-generate or revoke"
                            >
                              <RefreshCw size={11} />
                              <span>Evaluate</span>
                            </button>
                          )}
                          
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
