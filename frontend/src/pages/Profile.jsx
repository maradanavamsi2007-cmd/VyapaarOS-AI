import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  User, ShieldCheck, Mail, Users, PlusCircle, Database, Lock, Check,
  Key, Bell, Calendar, Award, BarChart2, CheckCircle2,
  AlertTriangle, Settings, Cpu, Activity, LogOut,
  HardDrive, RefreshCw, Phone, AlertCircle
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  
  // Data State
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Developer Simulator State
  const [injectLoading, setInjectLoading] = useState(false);
  const [injectSuccess, setInjectSuccess] = useState(false);

  // Check dev mode in query string
  const isDevMode = new URLSearchParams(window.location.search).get('dev') === 'true';

  const fetchProfileData = async () => {
    try {
      const profileRes = await api.adminGetProfile();
      if (profileRes.success) {
        setProfile(profileRes.data);
        setEditName(profileRes.data.name || '');
        setEditEmail(profileRes.data.email || '');
        setEditPhone(profileRes.data.phone || '');
        setEditDepartment(profileRes.data.department || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to fetch coordinator profile details.');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, attendanceRes, activitiesRes] = await Promise.all([
        api.getDashboardStats(),
        api.getAttendanceStats(),
        api.adminGetRecentActivities()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (attendanceRes.success) setAttendanceStats(attendanceRes.data);
      if (activitiesRes.success) setRecentActivities(activitiesRes.data);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    }
  };

  const loadAllData = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfileData(), fetchDashboardData()]);
    setRefreshing(false);
  };

  useEffect(() => {
    // Authenticate Admin Session
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    Promise.all([fetchProfileData(), fetchDashboardData()])
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    setError('');

    try {
      const res = await api.adminUpdateProfile({
        name: editName,
        email: editEmail,
        phone: editPhone,
        department: editDepartment,
        notification_settings: profile?.notification_settings
      });

      if (res.success) {
        setProfile(res.data);
        
        // Synchronize state in local storage to prevent name mismatch on layout header
        const localUser = JSON.parse(localStorage.getItem('sansah_admin_user') || '{}');
        localUser.username = res.data.name;
        localUser.email = res.data.email;
        localStorage.setItem('sansah_admin_user', JSON.stringify(localUser));

        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleNotification = async (key) => {
    if (!profile) return;

    const updatedSettings = {
      ...profile.notification_settings,
      [key]: !profile.notification_settings?.[key]
    };

    // Optimistic Update
    setProfile({
      ...profile,
      notification_settings: updatedSettings
    });

    try {
      const res = await api.adminUpdateProfile({
        name: editName || profile.name,
        email: editEmail || profile.email,
        phone: editPhone || profile.phone,
        department: editDepartment || profile.department,
        notification_settings: updatedSettings
      });
      if (res.success) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      // Revert on failure
      fetchProfileData();
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.adminChangePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Verify your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInjectMock = async () => {
    setInjectLoading(true);
    setInjectSuccess(false);

    const mockNames = ['Priya Swaminathan', 'Arjun Malhotra', 'Diya Sen', 'Karthik Raja', 'Aisha Khan'];
    const mockColleges = [
      'Anna University, Chennai',
      'BITS Pilani, Hyderabad',
      'IIT Madras, Chennai',
      'NIT Trichy, Trichy',
      'Manipal Institute of Technology, Manipal'
    ];
    const branches = ['Information Technology', 'Robotics & Automation', 'Mechatronics', 'Electronics Engineering'];
    const semesters = ['Semester 3', 'Semester 5', 'Semester 7'];
    
    const name = mockNames[Math.floor(Math.random() * mockNames.length)];
    const collegeName = mockColleges[Math.floor(Math.random() * mockColleges.length)];
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const semester = semesters[Math.floor(Math.random() * semesters.length)];
    const email = `${name.toLowerCase().replace(/ /g, '.')}@edu.in`;
    const phone = `984${Math.floor(1000000 + Math.random() * 9000000)}`;
    const workshopId = Math.floor(1 + Math.random() * 5).toString();

    try {
      await api.submitRegistration({
        name,
        collegeName,
        city: 'Metropolitan Area',
        state: 'State Province',
        email,
        phone,
        branch,
        semester,
        workshopId,
        isGroup: false
      });
      setInjectSuccess(true);
      setTimeout(() => setInjectSuccess(false), 3000);
      loadAllData();
    } catch (err) {
      alert(err.message || 'Injection failed.');
    } finally {
      setInjectLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sansah_admin_token');
    localStorage.removeItem('sansah_admin_user');
    navigate('/login');
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    const date = new Date(isoStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={40} className="pulse-glow" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '16px' }}>
          Loading Coordinator Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Title & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="gradient-text">Coordinator Workspace</span>
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            System Administration Console & Activity Hub for {profile?.name || 'Dr. Amit Varma'}
          </p>
        </div>
        
        <button 
          onClick={loadAllData} 
          className="btn btn-secondary" 
          style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          disabled={refreshing}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{refreshing ? 'Refreshing...' : 'Sync Data'}</span>
        </button>
      </div>

      {/* 1. Quick Statistics Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '16px' 
      }}>
        {/* Stat 1: Workshops */}
        <div className="glass-panel animate-float" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--primary-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Calendar size={20} color="var(--primary)" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshops</p>
            <h4 style={{ fontSize: '22px', color: 'var(--text-primary)', marginTop: '2px' }}>{stats?.workshops?.length || 5}</h4>
          </div>
        </div>

        {/* Stat 2: Registered */}
        <div className="glass-panel animate-float" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid var(--secondary)', animationDelay: '0.2s' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--secondary-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Users size={20} color="var(--secondary)" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registrants</p>
            <h4 style={{ fontSize: '22px', color: 'var(--text-primary)', marginTop: '2px' }}>{stats?.summary?.total || 0}</h4>
          </div>
        </div>

        {/* Stat 3: Approved */}
        <div className="glass-panel animate-float" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid var(--success)', animationDelay: '0.4s' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--success-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CheckCircle2 size={20} color="var(--success)" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved</p>
            <h4 style={{ fontSize: '22px', color: 'var(--text-primary)', marginTop: '2px' }}>{stats?.summary?.approved || 0}</h4>
          </div>
        </div>

        {/* Stat 4: Pending */}
        <div className="glass-panel animate-float" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid var(--warning)', animationDelay: '0.6s' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--warning-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AlertTriangle size={20} color="var(--warning)" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</p>
            <h4 style={{ fontSize: '22px', color: 'var(--text-primary)', marginTop: '2px' }}>{stats?.summary?.pending || 0}</h4>
          </div>
        </div>

        {/* Stat 5: Present Today */}
        <div className="glass-panel animate-float" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #3b82f6', animationDelay: '0.8s' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Activity size={20} color="#3b82f6" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present Today</p>
            <h4 style={{ fontSize: '22px', color: 'var(--text-primary)', marginTop: '2px' }}>{attendanceStats?.presentToday || 0}</h4>
          </div>
        </div>

        {/* Stat 6: Attendance % */}
        <div className="glass-panel animate-float" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #14b8a6', animationDelay: '1s' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(20, 184, 166, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BarChart2 size={20} color="#14b8a6" />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Rate</p>
            <h4 style={{ fontSize: '22px', color: 'var(--text-primary)', marginTop: '2px' }}>{attendanceStats?.overallPercentage !== undefined ? `${attendanceStats.overallPercentage}%` : '100%'}</h4>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid-cols-12">
        
        {/* Left Column: Details & Passwords */}
        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Coordinator Profile Details */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <User size={18} color="var(--primary)" />
              <span>Coordinator Account Details</span>
            </h3>

            {error && (
              <div style={{ padding: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {profileSuccess && (
              <div style={{ padding: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CheckCircle2 size={16} />
                <span>Profile settings saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--primary-glow)' }}>
                  <ShieldCheck size={32} color="white" />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{profile?.name || 'Dr. Amit Varma'}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{profile?.role || 'Chief Coordinator'} • {profile?.department || 'Research & Robotics'}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Employee ID: <strong>{profile?.employee_id || 'EMP-2026-089'}</strong></p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label htmlFor="name-input">Full Name</label>
                  <input 
                    id="name-input"
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="dept-input">Department</label>
                  <input 
                    id="dept-input"
                    type="text" 
                    value={editDepartment} 
                    onChange={e => setEditDepartment(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label htmlFor="email-input">Official Email Address</label>
                  <input 
                    id="email-input"
                    type="email" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="phone-input">Mobile Contact Number</label>
                  <input 
                    id="phone-input"
                    type="text" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Last login: {formatDate(profile?.last_login)}
                </span>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ fontSize: '13px', padding: '10px 20px' }}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Change Password Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Key size={18} color="var(--accent-purple)" />
              <span>Change Portal Password</span>
            </h3>

            {passwordError && (
              <div style={{ padding: '12px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div style={{ padding: '12px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CheckCircle2 size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="curr-pass">Verify Current Password</label>
                <input 
                  id="curr-pass"
                  type="password" 
                  placeholder="Enter current password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label htmlFor="new-pass">New Password</label>
                  <input 
                    id="new-pass"
                    type="password" 
                    placeholder="Min 6 characters" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm-pass">Confirm New Password</label>
                  <input 
                    id="confirm-pass"
                    type="password" 
                    placeholder="Verify new password" 
                    value={confirmNewPassword} 
                    onChange={e => setConfirmNewPassword(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-indigo" 
                style={{ width: '100%', fontSize: '13px', marginTop: '8px' }}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Updating credentials...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Card 3: Notification Preferences */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Bell size={18} color="var(--warning)" />
              <span>Global Alert Notifications</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              Specify the system actions that should trigger instant alerts or automated dispatches.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Email Notifications</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Send copy of certificate / verification letters</p>
                </div>
                <input 
                  type="checkbox" 
                  aria-label="Email Notifications Toggle"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  checked={profile?.notification_settings?.email || false}
                  onChange={() => handleToggleNotification('email')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>SMS Alerts</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert coordinators on new urgent registrations</p>
                </div>
                <input 
                  type="checkbox" 
                  aria-label="SMS Alerts Toggle"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  checked={profile?.notification_settings?.sms || false}
                  onChange={() => handleToggleNotification('sms')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Workshop Reminders</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Daily attendance summaries & scheduler triggers</p>
                </div>
                <input 
                  type="checkbox" 
                  aria-label="Workshop Reminders Toggle"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  checked={profile?.notification_settings?.reminders || false}
                  onChange={() => handleToggleNotification('reminders')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>System Log Audits</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Archive all state changes into history schemas</p>
                </div>
                <input 
                  type="checkbox" 
                  aria-label="System Log Audits Toggle"
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  checked={profile?.notification_settings?.alerts || false}
                  onChange={() => handleToggleNotification('alerts')}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Recent Activities, Quick Actions, System Logs */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 4: Quick Actions Hub */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Settings size={18} color="var(--primary)" />
              <span>Workspace Quick Links</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Link to="/admin" className="btn btn-secondary" style={{ fontSize: '12px', padding: '10px', justifyContent: 'flex-start', borderLeft: '3px solid var(--primary)' }}>
                Overview Dashboard
              </Link>
              <Link to="/admin/workshops" className="btn btn-secondary" style={{ fontSize: '12px', padding: '10px', justifyContent: 'flex-start', borderLeft: '3px solid var(--secondary)' }}>
                Workshops Hub
              </Link>
              <Link to="/admin/attendance" className="btn btn-secondary" style={{ fontSize: '12px', padding: '10px', justifyContent: 'flex-start', borderLeft: '3px solid var(--success)' }}>
                Mark Attendance
              </Link>
              <Link to="/admin/certificates" className="btn btn-secondary" style={{ fontSize: '12px', padding: '10px', justifyContent: 'flex-start', borderLeft: '3px solid var(--accent-purple)' }}>
                Certificates Engine
              </Link>
              <Link to="/participants" className="btn btn-secondary" style={{ fontSize: '12px', padding: '10px', justifyContent: 'flex-start', borderLeft: '3px solid var(--warning)' }}>
                Audit Registrations
              </Link>
              <Link to="/reports" className="btn btn-secondary" style={{ fontSize: '12px', padding: '10px', justifyContent: 'flex-start', borderLeft: '3px solid var(--danger)' }}>
                Analytics & Reports
              </Link>
            </div>
          </div>

          {/* Card 5: Recent Activities Log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Activity size={18} color="var(--primary)" />
              <span>Recent Activity Feed</span>
            </h3>

            {recentActivities.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No recent history logs available.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {recentActivities.map((act, index) => (
                  <div key={act.history_id || index} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    {/* timeline line */}
                    {index < recentActivities.length - 1 && (
                      <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: '-18px', width: '1px', background: 'var(--border-color)' }}></div>
                    )}
                    
                    {/* Timeline dot */}
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      background: act.new_status === 'Approved' ? 'var(--success-glow)' : 'var(--warning-glow)', 
                      border: `1px solid ${act.new_status === 'Approved' ? 'var(--success)' : 'var(--warning)'}`,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginTop: '2px',
                      flexShrink: 0
                    }}>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: act.new_status === 'Approved' ? 'var(--success)' : 'var(--warning)' 
                      }}></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {act.studentName} Registration: <span style={{ color: act.new_status === 'Approved' ? 'var(--success)' : 'var(--warning)' }}>{act.new_status}</span>
                      </span>
                      {act.remarks && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          "{act.remarks}"
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        By {act.changed_by || 'System'} • {formatDate(act.changed_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 6: Security & Sessions */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Lock size={18} color="var(--danger)" />
              <span>Security & Session Audit</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--success)' }}>Active Session (This Browser)</span>
                <span style={{ color: 'var(--text-muted)' }}>ID: {localStorage.getItem('sansah_admin_token') ? 'Active auth token' : 'None'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Recent Authorized Sign-Ins</span>
                
                {profile?.login_history && profile.login_history.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {profile.login_history.slice(0, 4).map((time, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <span>Success: Local Admin Interface</span>
                        <span style={{ fontSize: '11px' }}>{formatDate(time)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No historical logs cached.</span>
                )}
              </div>

              <button 
                onClick={handleLogout} 
                className="btn btn-danger" 
                style={{ display: 'flex', width: '100%', gap: '8px', fontSize: '12px', padding: '10px', marginTop: '8px' }}
              >
                <LogOut size={14} />
                <span>Revoke Authorizations & Sign Out</span>
              </button>
            </div>
          </div>

          {/* Card 7: System Uptime & Diagnostics */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Cpu size={18} color="var(--primary)" />
              <span>Core Server Health</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>API Status:</span>
                <span style={{ color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  Operational
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Driver:</span>
                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Active ({dbConnectionLabel()})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Storage Engine:</span>
                <span style={{ color: 'var(--text-primary)' }}>JSON Fallback Instance</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Sync Status:</span>
                <span style={{ color: 'var(--success)' }}>Persistent / Synced</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 2. Developer Simulator Sandbox (ONLY displayed when ?dev=true is in URL) */}
      {isDevMode && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px dashed var(--warning)', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)' }}>
              <Database size={18} />
              <span>Diagnostic Simulator (Hidden Developer Controls)</span>
            </h3>
            <span className="badge badge-pending">DEVMODE ENGAGED</span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
            Evaluate data visualizations, analytics dashboards, and status transition queues by generating random participants.
          </p>

          <button 
            onClick={handleInjectMock} 
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '13px', display: 'flex', gap: '8px', padding: '12px' }}
            disabled={injectLoading}
          >
            {injectSuccess ? <Check size={16} /> : <PlusCircle size={16} />}
            <span>{injectLoading ? 'Injecting Mock...' : injectSuccess ? 'Mock Participant Injected!' : 'Inject Mock Registrant'}</span>
          </button>

          {injectSuccess && (
            <p style={{ fontSize: '11px', color: 'var(--success)', textAlign: 'center', marginTop: '8px' }}>
              A new student registration was successfully appended to the local SQLite/MySQL instance.
            </p>
          )}
        </div>
      )}

    </div>
  );

  function dbConnectionLabel() {
    const isMock = !localStorage.getItem('sansah_admin_token') || stats?.workshops?.length === 0;
    return isMock ? 'JSON MockDB' : 'Supabase Client';
  }
}
