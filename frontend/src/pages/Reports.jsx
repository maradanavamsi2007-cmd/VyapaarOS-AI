import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { FileSpreadsheet, FileText, Printer, BarChart2, Download, CheckCircle, RefreshCw, Calendar } from 'lucide-react';


export default function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Authenticate Session
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadReportData();
  }, [navigate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.getDashboardStats();
      setStats(statsRes.data);

      const regsRes = await api.getAllRegistrations();
      setRegistrations(regsRes.data || []);
    } catch (err) {
      console.error('Error compiling reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Export registrations array to CSV format
  const exportToCSV = () => {
    if (registrations.length === 0) {
      alert('No records available to export.');
      return;
    }

    // Define CSV Headers
    const headers = [
      'Registration ID',
      'Date',
      'Student Name',
      'Student Email',
      'Student Phone',
      'Branch',
      'College Name',
      'Workshop Title',
      'Payment Status',
      'Verification Status'
    ];

    // Map rows
    const rows = registrations.map(reg => [
      reg.registration_id,
      new Date(reg.registration_date).toLocaleDateString('en-IN'),
      `"${reg.student_name.replace(/"/g, '""')}"`,
      reg.student_email,
      reg.student_phone,
      `"${reg.branch.replace(/"/g, '""')}"`,
      `"${reg.college_name.replace(/"/g, '""')}"`,
      `"${reg.workshop_title.replace(/"/g, '""')}"`,
      reg.payment_status,
      reg.confirmation_status
    ]);

    // Build content
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Create file trigger blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sansah_workshop_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Open printable view for PDF compiling
  const handlePrint = () => {
    window.print();
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading report matrices...</p>;

  const { summary, workshops, colleges } = stats || { summary: {}, workshops: [], colleges: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="reports-page-wrapper">
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>Analytics & Reports</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Download spreadsheets, trigger PDF compiler, and view core distribution channels.</p>
        </div>
        <button 
          onClick={loadReportData} 
          className="btn btn-secondary" 
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          <RefreshCw size={12} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Export panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="grid-cols-12">
        
        {/* CSV exporter card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ padding: '16px', background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: 'var(--success)' }}>
            <FileSpreadsheet size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Export CSV Spreadsheet</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Download a complete CSV workbook containing student contact data, branches, colleges, and verification statuses.
            </p>
            <button onClick={exportToCSV} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
              <Download size={14} />
              <span>Download CSV ({registrations.length} Rows)</span>
            </button>
          </div>
        </div>

        {/* PDF / Print report card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ padding: '16px', background: 'var(--primary-glow)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '12px', color: 'var(--primary)' }}>
            <FileText size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>Compile Printable PDF</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Generate a formatted, print-optimized document summarizing current statistics and registration tables.
            </p>
            <button onClick={handlePrint} className="btn btn-indigo" style={{ fontSize: '13px', padding: '8px 16px' }}>
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Attendance Reports Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '12px', color: 'var(--accent-purple)' }}>
            <Calendar size={32} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>7-Day Attendance Reports</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Compile daily logs, weekly grids, and workshop-wise attendance summaries, and download as CSV or PDF.
            </p>
            <button onClick={() => navigate('/admin/attendance')} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px', borderColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}>
              <span>View Attendance Reports</span>
            </button>
          </div>
        </div>

      </div>

      {/* Visual Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="grid-cols-12">
        
        {/* Workshop Share Visual */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--primary)" />
            <span>Workshop Allocations (Fill Rates)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {workshops.map(w => {
              const fillPercent = Math.min(100, Math.round((w.count / w.capacity) * 100));
              return (
                <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: '500' }}>{w.title}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{w.count} / {w.capacity} seats ({fillPercent}%)</span>
                  </div>
                  {/* Custom CSS visual bar */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${fillPercent}%`, 
                      height: '100%', 
                      background: fillPercent >= 100 ? 'var(--warning)' : 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                      borderRadius: '4px',
                      transition: 'var(--transition-smooth)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification metrics bar breakdown */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="var(--success)" />
            <span>Verification Distribution Ratio</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Approved Ratio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--success)' }}>Approved entries</span>
                <span>{summary.approved} / {summary.total}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${summary.total ? (summary.approved / summary.total) * 100 : 0}%`, height: '100%', background: 'var(--success)' }} />
              </div>
            </div>

            {/* Pending Ratio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--warning)' }}>Pending verification</span>
                <span>{summary.pending} / {summary.total}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${summary.total ? (summary.pending / summary.total) * 100 : 0}%`, height: '100%', background: 'var(--warning)' }} />
              </div>
            </div>

            {/* Rejected Ratio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--danger)' }}>Disqualified / Rejected</span>
                <span>{summary.rejected} / {summary.total}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${summary.total ? (summary.rejected / summary.total) * 100 : 0}%`, height: '100%', background: 'var(--danger)' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Printable Sheet Area (Hidden by default, displayed in `@media print`) */}
      <div className="printable-report-sheet" style={{ display: 'none' }}>
        <div style={{ padding: '32px', color: '#000', background: '#fff' }}>
          <h2 style={{ fontSize: '24px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>Sansah Innovations - Workshop Registration Summary</h2>
          <p style={{ fontSize: '12px', margin: '8px 0 24px 0' }}>Generated on: {new Date().toLocaleString('en-IN')}</p>
          
          <div style={{ display: 'flex', gap: '40px', marginBottom: '24px', fontSize: '14px' }}>
            <p><strong>Total Submissions:</strong> {summary.total}</p>
            <p><strong>Approved:</strong> {summary.approved}</p>
            <p><strong>Pending:</strong> {summary.pending}</p>
          </div>

          <h3 style={{ fontSize: '16px', borderBottom: '1px solid #ccc', paddingBottom: '6px', marginTop: '24px' }}>Workshop Enrollments</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px 0' }}>Workshop Title</th>
                <th>Enrolled Slots</th>
                <th>Capacity Limit</th>
                <th>Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 0' }}>{w.title}</td>
                  <td>{w.count}</td>
                  <td>{w.capacity}</td>
                  <td>{Math.min(100, Math.round((w.count / w.capacity) * 100))}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: '16px', borderBottom: '1px solid #ccc', paddingBottom: '6px', marginTop: '32px' }}>Registration Registry</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px 0' }}>ID</th>
                <th>Date</th>
                <th>Student Name</th>
                <th>College Name</th>
                <th>Workshop</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(reg => (
                <tr key={reg.registration_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 0' }}>#{reg.registration_id}</td>
                  <td>{new Date(reg.registration_date).toLocaleDateString('en-IN')}</td>
                  <td>{reg.student_name}</td>
                  <td>{reg.college_name}</td>
                  <td>{reg.workshop_title}</td>
                  <td>{reg.confirmation_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: #fff !important;
            color: #000 !important;
          }
          .printable-report-sheet, .printable-report-sheet * {
            visibility: visible;
          }
          .printable-report-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
