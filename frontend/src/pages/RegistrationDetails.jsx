import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import AISummaryModal from '../components/AISummaryModal';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  School, 
  Cpu, 
  Users, 
  Calendar, 
  Award, 
  ExternalLink, 
  Save, 
  Check, 
  Sparkles,
  ClipboardList,
  FileCode,
  FileCheck
} from 'lucide-react';

export default function RegistrationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status Audit Form State
  const [status, setStatus] = useState('Pending');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [remarks, setRemarks] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // Attendance Form State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState('Present');
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Project Submission Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [projectScore, setProjectScore] = useState('');
  const [projectRemarks, setProjectRemarks] = useState('');
  const [projectLoading, setProjectLoading] = useState(false);

  // Certificate Issuance State
  const [certLoading, setCertLoading] = useState(false);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [aiModalContent, setAiModalContent] = useState('');
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiTriggerType, setAiTriggerType] = useState(''); // confirmation, instructions, coordinator

  useEffect(() => {
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadDetails();
  }, [id, navigate]);

  const loadDetails = () => {
    setLoading(true);
    api.getRegistrationDetails(id)
      .then(res => {
        const d = res.data;
        setData(d);
        setStatus(d.confirmation_status);
        setPaymentStatus(d.payment_status);
        
        // Populate submission form if exists
        if (d.submissions && d.submissions.length > 0) {
          const sub = d.submissions[0];
          setProjectTitle(sub.project_title || '');
          setProjectDesc(sub.description || '');
          setProjectLink(sub.submission_link || '');
          setProjectScore(sub.score !== null && sub.score !== undefined ? sub.score.toString() : '');
          setProjectRemarks(sub.remarks || '');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching details:', err);
        setLoading(false);
      });
  };

  // 1. Submit Audit Status updates
  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    setAuditLoading(true);
    try {
      if (status !== data.confirmation_status) {
        await api.updateRegistrationStatus(id, status, remarks);
      }
      if (paymentStatus !== data.payment_status) {
        await api.updatePaymentStatus(id, paymentStatus, remarks);
      }
      setRemarks('');
      loadDetails();
      alert('Registration audit log updated successfully.');
    } catch (err) {
      alert(err.message || 'Failed to update audit log.');
    } finally {
      setAuditLoading(false);
    }
  };

  // 2. Submit Attendance Log
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setAttendanceLoading(true);
    try {
      await api.recordAttendance(id, attendanceDate, attendanceStatus);
      loadDetails();
      alert('Attendance record saved.');
    } catch (err) {
      alert(err.message || 'Failed to save attendance.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // 3. Submit Project evaluation
  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setProjectLoading(true);
    try {
      const payload = {
        projectTitle,
        description: projectDesc,
        submissionLink: projectLink,
        score: projectScore ? parseInt(projectScore) : null,
        remarks: projectRemarks
      };
      await api.submitProject(id, payload);
      loadDetails();
      alert('Project assessment records saved.');
    } catch (err) {
      alert(err.message || 'Failed to save project records.');
    } finally {
      setProjectLoading(false);
    }
  };

  // 4. Issue Certificate
  const handleIssueCertificate = async () => {
    setCertLoading(true);
    try {
      await api.issueCertificate(id);
      loadDetails();
      alert('Certificate issued successfully!');
    } catch (err) {
      alert(err.message || 'Failed to issue certificate.');
    } finally {
      setCertLoading(false);
    }
  };

  // 5. Trigger AI Generation
  const triggerAIGeneration = async (type) => {
    setAiTriggerType(type);
    setAiModalOpen(true);
    setAiModalLoading(true);
    
    let titleStr = '';
    if (type === 'confirmation') titleStr = 'AI Confirmation Note';
    if (type === 'instructions') titleStr = 'AI Joining Instructions';
    if (type === 'coordinator') titleStr = 'AI Coordinator Memo';
    setAiModalTitle(titleStr);

    try {
      let response;
      if (type === 'confirmation') response = await api.generateConfirmation(id);
      if (type === 'instructions') response = await api.generateJoiningInstructions(id);
      if (type === 'coordinator') response = await api.generateCoordinatorNotes(id);
      
      setAiModalContent(response.data);
    } catch (err) {
      setAiModalContent('AI engine failed to execute. Please confirm endpoint configurations.');
    } finally {
      setAiModalLoading(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading registration data...</p>;
  if (!data) return <p style={{ color: 'var(--text-secondary)' }}>Registration record not found.</p>;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Back button link */}
      <div>
        <Link to="/participants" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
          <ArrowLeft size={16} />
          <span>Back to Participant Console</span>
        </Link>
      </div>

      {/* Header Profile Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }} className="grid-cols-12">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>REGISTRATION REF: #SANSAH-REG-{data.registration_id}</span>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', marginTop: '4px' }}>{data.student_name}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Registered for {data.workshop_title} on {formatDate(data.registration_date)}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <span className={`badge ${data.payment_status === 'Completed' ? 'badge-completed' : 'badge-pending'}`} style={{ padding: '8px 16px', fontSize: '12px' }}>
            Payment: {data.payment_status}
          </span>
          <span className={`badge ${data.confirmation_status === 'Approved' ? 'badge-approved' : 'badge-pending'}`} style={{ padding: '8px 16px', fontSize: '12px' }}>
            Verify: {data.confirmation_status}
          </span>
        </div>
      </div>

      {/* Grid Layout: Left profiles, Right AI controls / Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }} className="grid-cols-12">
        
        {/* Left Side: Profile logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Student & College Metadata card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} color="var(--primary)" />
              <span>Student Profile Details</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="grid-cols-12">
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>EMAIL ID</p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginTop: '4px' }}>{data.student_email}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PHONE NUMBER</p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginTop: '4px' }}>{data.student_phone}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>COLLEGE / CAMPUS</p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginTop: '4px' }}>{data.college_name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{data.college_city}, {data.college_state}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ACADEMIC PROFILE</p>
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginTop: '4px' }}>{data.branch}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{data.semester}</p>
              </div>
            </div>

            {/* Team details section */}
            {data.team_id && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Users size={16} />
                  <span>Group Allocations: {data.team_name} ({data.member_count} Members)</span>
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-12">
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--primary)' }}>Team Leader (Contact)</p>
                    <p style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px' }}>{data.student_name} (You)</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{data.student_email}</p>
                  </div>
                  {data.team_members.map((m, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Member #{idx+1}</p>
                      <p style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px' }}>{m.student_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.student_email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attendance logger */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={16} color="var(--primary)" />
              <span>Session Attendance Records</span>
            </h3>

            {/* Existing log summary */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {data.attendance && data.attendance.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No attendance registered for this participant yet.</p>
              ) : (
                data.attendance.map((att) => (
                  <span 
                    key={att.attendance_id} 
                    className={`badge ${att.status === 'Present' ? 'badge-approved' : 'badge-rejected'}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {att.session_date}: {att.status}
                  </span>
                ))
              )}
            </div>

            {/* Attendance form */}
            <form onSubmit={handleAttendanceSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }} className="grid-cols-12">
              <div>
                <label style={{ fontSize: '11px' }}>Session Date</label>
                <input 
                  type="date" 
                  value={attendanceDate} 
                  onChange={(e) => setAttendanceDate(e.target.value)} 
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px' }}>Status</label>
                <select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <button type="submit" className="btn btn-secondary" style={{ padding: '12px', display: 'flex', gap: '6px' }} disabled={attendanceLoading}>
                <Check size={14} />
                <span>Log</span>
              </button>
            </form>
          </div>

          {/* Project submission panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={16} color="var(--primary)" />
              <span>Project Assessment Details</span>
            </h3>

            <form onSubmit={handleProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }} className="grid-cols-12">
                <div>
                  <label style={{ fontSize: '11px' }}>Project Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Smart Irrigation System" 
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px' }}>Assessment Score (Max 100)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 90" 
                    value={projectScore}
                    min="0"
                    max="100"
                    onChange={(e) => setProjectScore(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Git / Project Output URL</label>
                <input 
                  type="url" 
                  placeholder="https://github.com/..." 
                  value={projectLink}
                  onChange={(e) => setProjectLink(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Project Summary Description</label>
                <textarea 
                  rows="2" 
                  placeholder="Explain hardware elements or code modules..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Assessor Remarks</label>
                <textarea 
                  rows="2" 
                  placeholder="Enter remarks for feedback..."
                  value={projectRemarks}
                  onChange={(e) => setProjectRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {projectLink && (
                  <a 
                    href={projectLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontSize: '12px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <span>Visit Submission</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button type="submit" className="btn btn-indigo" style={{ padding: '10px 20px', fontSize: '13px', display: 'flex', gap: '6px' }} disabled={projectLoading}>
                  <Save size={14} />
                  <span>Save Assessment</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Side: Audits and Generative AI Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* AI Helper Tools Box */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(17,25,40,0.85) 0%, rgba(10,15,30,0.95) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.15)'
            }}
          >
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--primary)" className="pulse-glow" />
              <span>Sansah AI Engine</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => triggerAIGeneration('confirmation')}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '12px', padding: '10px', justifyContent: 'flex-start' }}
              >
                <Sparkles size={14} />
                <span>Confirm Message</span>
              </button>

              <button 
                onClick={() => triggerAIGeneration('instructions')}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '12px', padding: '10px', justifyContent: 'flex-start' }}
              >
                <Sparkles size={14} style={{ color: 'var(--secondary)' }} />
                <span>Joining Guide</span>
              </button>

              <button 
                onClick={() => triggerAIGeneration('coordinator')}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '12px', padding: '10px', justifyContent: 'flex-start' }}
              >
                <Sparkles size={14} style={{ color: 'var(--accent-purple)' }} />
                <span>Coordinator Letter</span>
              </button>
            </div>
          </div>

          {/* Certificate Issuer Box */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="var(--success)" />
              <span>Workshop Certificate</span>
            </h3>

            {data.certificate ? (
              <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: 'var(--success)' }}>CERTIFICATE ISSUED</p>
                <p style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{data.certificate.certificate_code}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Issued: {formatDate(data.certificate.issue_date)}</p>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); alert('Placeholder: Downloading certificate PDF'); }}
                  style={{ fontSize: '12px', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', textDecoration: 'none', fontWeight: '600' }}
                >
                  <FileCheck size={14} />
                  <span>Download PDF Credentials</span>
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Issue an official workshop completion certificate once the participant profile is Approved.
                </p>
                <button 
                  onClick={handleIssueCertificate}
                  className="btn btn-indigo" 
                  style={{ width: '100%', fontSize: '13px' }}
                  disabled={data.confirmation_status !== 'Approved' || certLoading}
                >
                  {certLoading ? 'Generating...' : 'Issue Certificate'}
                </button>
              </div>
            )}
          </div>

          {/* Verification Audit Log updates Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={16} color="var(--primary)" />
              <span>Audit Controls</span>
            </h3>

            <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px' }}>Verification Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Payment Verification</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Audit Remarks / Comments</label>
                <textarea 
                  rows="3" 
                  placeholder="Explain why status was changed..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '13px' }} disabled={auditLoading}>
                {auditLoading ? 'Saving Audit...' : 'Update Audit Log'}
              </button>
            </form>
          </div>

          {/* History logs trail */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>History Trail</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '200px', overflowY: 'auto' }}>
              {data.history && data.history.map((hist) => (
                <div key={hist.history_id} style={{ fontSize: '11px', borderLeft: '2px solid var(--primary)', paddingLeft: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>By: {hist.changed_by}</span>
                    <span>{new Date(hist.changed_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p style={{ marginTop: '2px', color: 'var(--text-primary)' }}>
                    State: <strong>{hist.previous_status ? `${hist.previous_status} ➜ ` : ''}{hist.new_status}</strong>
                  </p>
                  {hist.remarks && <p style={{ color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>"{hist.remarks}"</p>}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* AISummaryModal */}
      <AISummaryModal 
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={aiModalTitle}
        content={aiModalContent}
        loading={aiModalLoading}
        onRegenerate={() => triggerAIGeneration(aiTriggerType)}
      />

    </div>
  );
}
