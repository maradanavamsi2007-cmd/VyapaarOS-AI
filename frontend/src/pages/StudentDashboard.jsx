import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  GraduationCap, 
  BookOpen, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  Award, 
  ExternalLink, 
  Save, 
  PlusCircle, 
  AlertTriangle,
  Sparkles,
  Bell,
  Download
} from 'lucide-react';

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [allWorkshops, setAllWorkshops] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectForms, setProjectForms] = useState({}); // { [regId]: { title, link, desc } }
  const [projectSubmitting, setProjectSubmitting] = useState({});
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const token = localStorage.getItem('sansah_student_token');
    if (!token) {
      navigate('/student/login');
      return;
    }
    loadDashboard();
  }, [navigate]);

  const loadDashboard = () => {
    setLoading(true);

    // Fetch all workshops for catalog
    api.getWorkshops()
      .then(res => setAllWorkshops(res.data || []))
      .catch(err => console.error('Error fetching catalog:', err));

    // Fetch student notifications
    api.studentGetNotifications()
      .then(res => setNotifications(res.data || []))
      .catch(err => console.error('Error fetching notifications:', err));

    api.getStudentDashboard()
      .then(res => {
        setDashboardData(res.data);
        
        // Initialize project forms with existing values
        const forms = {};
        res.data.registrations.forEach(reg => {
          if (reg.submission) {
            forms[reg.registration_id] = {
              title: reg.submission.project_title || '',
              link: reg.submission.submission_link || '',
              desc: reg.submission.description || ''
            };
          } else {
            forms[reg.registration_id] = { title: '', link: '', desc: '' };
          }
        });
        setProjectForms(forms);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading student dashboard:', err);
        setLoading(false);
      });
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await api.studentMarkNotificationRead(notificationId);
      // Reload notifications
      const res = await api.studentGetNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleFormChange = (regId, field, value) => {
    setProjectForms(prev => ({
      ...prev,
      [regId]: {
        ...prev[regId],
        [field]: value
      }
    }));
  };

  const handleProjectSubmit = async (e, regId) => {
    e.preventDefault();
    const form = projectForms[regId];
    if (!form.title.trim() || !form.link.trim()) {
      alert('Please fill in both the project title and output link.');
      return;
    }

    setProjectSubmitting(prev => ({ ...prev, [regId]: true }));
    try {
      await api.studentSubmitProject(regId, {
        projectTitle: form.title,
        submissionLink: form.link,
        description: form.desc
      });
      alert('Project work successfully submitted to Sansah Innovations!');
      loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to submit project work.');
    } finally {
      setProjectSubmitting(prev => ({ ...prev, [regId]: false }));
    }
  };

  const handleDownload = async (code) => {
    try {
      const response = await fetch(`/api/certificates/download/${code}`);
      if (!response.ok) {
        const text = await response.text();
        let message = 'Failed to download certificate.';
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || message;
        } catch (_) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate-${code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error occurred while downloading certificate.');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading student dashboard details...</p>;
  if (!dashboardData) return <p style={{ color: 'var(--text-secondary)' }}>Failed to load profile details.</p>;

  const { profile, registrations } = dashboardData;

  const now = new Date();
  const parseDeadline = (deadlineStr) => {
    if (!deadlineStr) return null;
    const formatted = deadlineStr.includes(' ') ? deadlineStr.replace(' ', 'T') : deadlineStr;
    return new Date(formatted);
  };

  const upcomingRegistrations = registrations.filter(reg => {
    const deadline = parseDeadline(reg.deadline);
    if (!deadline) return true; // Fallback to upcoming if no deadline
    return deadline >= now;
  });

  const completedRegistrations = registrations.filter(reg => {
    const deadline = parseDeadline(reg.deadline);
    if (!deadline) return false;
    return deadline < now;
  });

  const activeRegistrations = activeTab === 'upcoming' ? upcomingRegistrations : completedRegistrations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Unread Notifications Banner */}
      {notifications.filter(n => !n.is_read).map(n => (
        <div 
          key={n.notification_id} 
          className="glass-panel" 
          style={{ 
            padding: '16px 20px', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(9, 28, 21, 0.4) 100%)', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            borderRadius: '8px', 
            fontSize: '13px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '12px',
            color: '#10b981',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-glow" style={{ fontSize: '16px' }}>🎉</span>
            <span><strong>{n.message}</strong></span>
          </div>
          <button 
            onClick={() => handleMarkNotificationRead(n.notification_id)}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '11px', 
              borderColor: 'rgba(16, 185, 129, 0.3)', 
              color: 'var(--text-primary)',
              background: 'transparent'
            }}
          >
            Dismiss
          </button>
        </div>
      ))}

      {profile.name === 'New Student' && (
        <div className="glass-panel" style={{ 
          padding: '16px 20px', 
          background: 'rgba(0, 240, 255, 0.03)', 
          border: '1px solid rgba(0, 240, 255, 0.2)', 
          borderRadius: '8px', 
          fontSize: '13px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          color: 'var(--primary)'
        }}>
          <span className="pulse-glow" style={{ fontSize: '16px' }}>✨</span>
          <span><strong>Welcome to Sansah Innovations!</strong> Please click <strong>"Register Course"</strong> in the sidebar to enroll in a workshop. Your profile details (Name, College, and Phone) will be automatically updated from your enrollment details.</span>
        </div>
      )}

      {/* Profile Overview Header Card */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(17,25,40,0.8) 0%, rgba(99,102,241,0.05) 100%)',
          borderColor: 'rgba(0, 240, 255, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--primary-glow)', border: '1px solid var(--primary)',
            color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <GraduationCap size={32} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--primary)', letterSpacing: '0.05em', fontWeight: '600' }}>ACADEMIC PROFILE</span>
            <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '2px' }}>{profile.name}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {profile.branch} | {profile.semester} | <strong>{profile.college_name}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--primary-glow)', borderRadius: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Registered</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{registrations.length}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Upcoming Workshops</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{upcomingRegistrations.length}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed Workshops</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{completedRegistrations.length}</div>
          </div>
        </div>
      </div>

      {/* Available Workshop Catalog Section */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--primary)" />
          <span>Available Workshop Catalog</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {allWorkshops.map(w => {
            const isEnrolled = registrations.some(reg => reg.workshop_id === w.workshop_id);
            const isFull = w.status === 'Full';
            const isSuspended = w.status === 'Suspended';
            
            return (
              <div 
                key={w.workshop_id} 
                className="glass-panel" 
                style={{ 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: isSuspended ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>{w.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{w.description}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '12px' }}>
                  <div>Trainer: <strong>{w.trainer_name}</strong></div>
                  <div>Schedule: {w.schedule || 'TBA'}</div>
                  <div>Venue: {w.venue || 'TBA'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>INR {w.fee}</span>
                    
                    {isEnrolled ? (
                      <span className="badge badge-approved" style={{ fontSize: '10px' }}>Enrolled</span>
                    ) : isSuspended ? (
                      <span className="badge badge-rejected" style={{ fontSize: '10px' }}>Suspended</span>
                    ) : isFull ? (
                      <span className="badge badge-pending" style={{ fontSize: '10px' }}>Full</span>
                    ) : (
                      <Link 
                        to={`/register?workshopId=${w.workshop_id}`} 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        Enroll Now
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Workshops Section */}
      <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <GraduationCap size={18} color="var(--primary)" />
            <span>My Workshops</span>
          </h3>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0px', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('upcoming')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'upcoming' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '-1px'
            }}
          >
            Upcoming ({upcomingRegistrations.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'completed' ? '2px solid var(--success)' : '2px solid transparent',
              color: activeTab === 'completed' ? 'var(--success)' : 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '-1px'
            }}
          >
            Completed ({completedRegistrations.length})
          </button>
        </div>

        {registrations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={32} color="var(--warning)" style={{ marginBottom: '12px', display: 'inline-block' }} />
            <h4 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>You have not registered for any workshops yet</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Explore our tech catalog and enroll in IoT, Embedded Systems, PCB Design, Robotics, and Smart Home technology.
            </p>
            <Link to="/register" className="btn btn-primary">
              Browse & Register Now
            </Link>
          </div>
        ) : activeRegistrations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <Clock size={28} color="var(--text-muted)" style={{ marginBottom: '8px', display: 'inline-block' }} />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {activeTab === 'upcoming' ? 'No upcoming workshops registered.' : 'No completed workshops registered yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {activeRegistrations.map((reg) => {
              const form = projectForms[reg.registration_id] || { title: '', link: '', desc: '' };
              const isApproved = reg.confirmation_status === 'Approved';
              const formattedRegDate = reg.registration_date 
                ? new Date(reg.registration_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'TBA';
              
              return (
                <div 
                  key={reg.registration_id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '24px',
                    borderLeft: `4px solid ${isApproved ? 'var(--success)' : 'var(--warning)'}`
                  }}
                >
                  
                  {/* Top Workshop Header info */}
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>{reg.workshop_title}</h4>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span>Trainer: <strong>{reg.trainer_name}</strong></span>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <span>Registered on: <strong>{formattedRegDate}</strong></span>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <span>Fee: <strong>INR {reg.workshop_fee}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                      <span className={`badge ${reg.payment_status === 'Completed' ? 'badge-completed' : 'badge-pending'}`}>
                        Payment: {reg.payment_status}
                      </span>
                      <span className={`badge ${isApproved ? 'badge-approved' : 'badge-pending'}`}>
                        Status: {reg.confirmation_status}
                      </span>
                    </div>
                  </div>

                  {/* Body Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }} className="grid-cols-12">
                    
                    {/* Left side details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Schedule & Venue Card */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <Calendar size={15} color="var(--primary)" />
                          <span><strong>Schedule:</strong> {reg.schedule || 'TBA'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <MapPin size={15} color="var(--primary)" />
                          <span><strong>Venue:</strong> {reg.venue || 'TBA'}</span>
                        </div>
                      </div>

                      {/* Attendance Summary */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>7-Day Program Attendance Status:</strong>
                        
                        {/* 7-Day Status Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '10px', marginBottom: '16px' }}>
                          {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                            const dayRecord = reg.student_attendance?.find(a => a.day_number === dayNum);
                            const status = dayRecord ? dayRecord.status : 'Pending';
                            
                            const color = status === 'Present' ? 'var(--success)' : status === 'Absent' ? 'var(--danger)' : 'var(--warning)';
                            const bgColor = status === 'Present' ? 'var(--success-glow)' : status === 'Absent' ? 'var(--danger-glow)' : 'var(--warning-glow)';
                            const border = status === 'Present' ? 'rgba(16,185,129,0.2)' : status === 'Absent' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';
                            const icon = status === 'Present' ? '✅' : status === 'Absent' ? '❌' : '⏳';
                            
                            return (
                              <div 
                                key={dayNum} 
                                style={{
                                  background: bgColor,
                                  border: `1px solid ${border}`,
                                  borderRadius: '6px',
                                  padding: '8px 4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10px',
                                  color: color,
                                  textAlign: 'center'
                                }}
                                title={dayRecord ? `Marked on ${dayRecord.attendance_date}` : 'Not recorded yet'}
                              >
                                <span style={{ fontSize: '12px' }}>{icon}</span>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Day {dayNum}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Circular Progress & Rating Indicator */}
                        {(() => {
                          const summary = reg.attendance_summary || {
                            total_days: 7,
                            present_days: 0,
                            absent_days: 0,
                            late_days: 0,
                            attended_days: 0,
                            attendance_percentage: 0
                          };

                          let progressText = 'Needs Improvement';
                          let progressColor = 'var(--danger)';
                          let progressBg = 'rgba(239, 68, 68, 0.15)';
                          
                          if (summary.attendance_percentage === 100) {
                            progressText = 'Excellent';
                            progressColor = 'var(--success)';
                            progressBg = 'rgba(16, 185, 129, 0.15)';
                          } else if (summary.attendance_percentage >= 90) {
                            progressText = 'Very Good';
                            progressColor = 'var(--primary)';
                            progressBg = 'rgba(0, 240, 255, 0.15)';
                          } else if (summary.attendance_percentage >= 75) {
                            progressText = 'Good';
                            progressColor = 'rgb(245, 158, 11)';
                            progressBg = 'rgba(245, 158, 11, 0.15)';
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.15)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg style={{ transform: 'rotate(-90deg)', width: '64px', height: '64px' }}>
                                    <circle
                                      cx="32" cy="32" r="28"
                                      stroke="rgba(255,255,255,0.05)"
                                      strokeWidth="4"
                                      fill="transparent"
                                    />
                                    <circle
                                      cx="32" cy="32" r="28"
                                      stroke={progressColor}
                                      strokeWidth="4"
                                      fill="transparent"
                                      strokeDasharray={2 * Math.PI * 28}
                                      strokeDashoffset={2 * Math.PI * 28 * (1 - (summary.attendance_percentage || 0) / 100)}
                                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                  </svg>
                                  <div style={{ position: 'absolute', fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {summary.attendance_percentage}%
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Attendance Rating</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: progressColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{progressText}</span>
                                    <span style={{ fontSize: '10px', background: progressBg, padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                      {summary.attended_days} / {summary.total_days} Days
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Days</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{summary.total_days}</div>
                                </div>
                                <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--success)' }}>Present</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>{summary.present_days}</div>
                                </div>
                                <div style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--danger)' }}>Absent</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--danger)', marginTop: '2px' }}>{summary.absent_days}</div>
                                </div>
                                <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: 'rgb(245, 158, 11)' }}>Late</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'rgb(245, 158, 11)', marginTop: '2px' }}>{summary.late_days}</div>
                                </div>
                              </div>

                            </div>
                          );
                        })()}
                      </div>

                      {/* Certificate downloads */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Credentials:</strong>
                        
                        <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                          Certificate Status: <strong style={{ color: reg.certificate ? 'var(--success)' : 'var(--warning)' }}>{reg.certificate ? 'Issued' : 'Not Issued'}</strong>
                        </div>

                        {reg.attendance_percentage < 90 ? (
                          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} />
                            <span>Ineligible: Min 90% attendance required (Must attend at least 7 out of 7 days). Current: {Math.round(reg.attendance_percentage / 100 * 7)}/7 days.</span>
                          </div>
                        ) : reg.certificate ? (
                          <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>
                              <Award size={14} />
                              <span>CERTIFICATE READY</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Code: {reg.certificate.certificate_code}</span>
                            <button 
                              onClick={() => handleDownload(reg.certificate.certificate_code)}
                              className="btn btn-indigo" 
                              style={{ padding: '6px 12px', fontSize: '11px', gap: '4px', alignSelf: 'flex-start', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Download size={12} />
                              <span>Download Certificate</span>
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, lineHeight: '1.4' }}>
                            {isApproved ? 'Your certificate has not been issued yet. Please wait for the coordinator to approve and issue it.' : 'Course must be approved before certificate is issued.'}
                          </p>
                        )}
                      </div>

                    </div>

                    {/* Right side Project Work Form */}
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '14px', display: 'block', marginBottom: '12px', color: 'var(--primary)' }}>Project Work Submission</strong>
                      
                      <form onSubmit={(e) => handleProjectSubmit(e, reg.registration_id)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '10px' }}>Project Title</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Smart Trash Bin"
                            value={form.title}
                            onChange={(e) => handleFormChange(reg.registration_id, 'title', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px' }}>Repository / Deployment Link</label>
                          <input 
                            type="url" 
                            placeholder="https://github.com/..."
                            value={form.link}
                            onChange={(e) => handleFormChange(reg.registration_id, 'link', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px' }}>Implementation Summary</label>
                          <textarea 
                            rows="2" 
                            placeholder="Enter short details..."
                            value={form.desc}
                            onChange={(e) => handleFormChange(reg.registration_id, 'desc', e.target.value)}
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '12px', width: 'auto', alignSelf: 'flex-end' }}
                          disabled={projectSubmitting[reg.registration_id]}
                        >
                          <Save size={12} />
                          <span>{reg.submission ? 'Update Submission' : 'Submit Project Code'}</span>
                        </button>
                      </form>

                      {reg.submission && (
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Assessor Feedback:</span>
                          <div style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                            <strong>Score:</strong> {reg.submission.score !== null ? `${reg.submission.score}/100` : 'Not evaluated yet'}
                          </div>
                          {reg.submission.remarks && (
                            <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                              Remarks: "{reg.submission.remarks}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Attendance History Section */}
                  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <strong style={{ fontSize: '13px', display: 'block', marginBottom: '12px', color: 'var(--text-primary)' }}>Attendance History:</strong>
                    {reg.student_attendance && reg.student_attendance.length > 0 ? (
                      <div className="table-container" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <table className="custom-table" style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '8px 12px', fontWeight: '600' }}>Date</th>
                              <th style={{ padding: '8px 12px', fontWeight: '600' }}>Workshop Name</th>
                              <th style={{ padding: '8px 12px', fontWeight: '600' }}>Status</th>
                              <th style={{ padding: '8px 12px', fontWeight: '600' }}>Marked Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reg.student_attendance.map((day, dayIdx) => (
                              <tr key={dayIdx} style={{ borderBottom: dayIdx < reg.student_attendance.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                  {day.attendance_date} (Day {day.day_number})
                                </td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                  {reg.workshop_title}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span className={`badge ${
                                    day.status === 'Present' ? 'badge-approved' : 
                                    day.status === 'Absent' ? 'badge-rejected' : 'badge-pending'
                                  }`} style={{
                                    background: day.status === 'Late' ? 'rgba(245, 158, 11, 0.15)' : undefined, 
                                    color: day.status === 'Late' ? 'rgb(245, 158, 11)' : undefined,
                                    border: day.status === 'Late' ? '1px solid rgba(245, 158, 11, 0.3)' : undefined
                                  }}>
                                    {day.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                  {day.updated_at || day.created_at ? new Date(day.updated_at || day.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No attendance records logged yet.</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
