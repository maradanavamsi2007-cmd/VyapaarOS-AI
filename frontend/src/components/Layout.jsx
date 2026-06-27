import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  FileText, 
  User, 
  LogOut, 
  LogIn, 
  Menu, 
  X, 
  Terminal,
  BrainCircuit,
  GraduationCap,
  Settings,
  Cpu,
  Calendar,
  Award
} from 'lucide-react';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Auth states check
  const isAdminLoggedIn = !!localStorage.getItem('sansah_admin_token');
  const isStudentLoggedIn = !!localStorage.getItem('sansah_student_token');
  
  const adminUser = JSON.parse(localStorage.getItem('sansah_admin_user') || '{}');
  const studentUser = JSON.parse(localStorage.getItem('sansah_student_user') || '{}');

  const handleLogout = () => {
    localStorage.clear(); // Clear all keys
    navigate('/');
  };

  // Construct dynamic navigation links based on user role
  let navItems = [];

  if (isAdminLoggedIn) {
    // Admin Side Menu
    navItems = [
      { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Workshop CRUD', path: '/admin/workshops', icon: Cpu },
      { name: 'Participant Audits', path: '/participants', icon: Users },
      { name: 'Attendance Management', path: '/admin/attendance', icon: Calendar },
      { name: 'Certificates', path: '/admin/certificates', icon: Award },
      { name: 'Reports & Export', path: '/reports', icon: FileText },
      { name: 'Console Profile', path: '/profile', icon: User }
    ];
  } else if (isStudentLoggedIn) {
    // Student Side Menu
    navItems = [
      { name: 'Home Catalog', path: '/workshops', icon: Home },
      { name: 'Register Course', path: '/register', icon: BookOpen },
      { name: 'My Workshops', path: '/student/dashboard', icon: GraduationCap },
      { name: 'My Certificates', path: '/student/certificates', icon: Award }
    ];
  } else {
    // Visitor Side Menu
    navItems = [
      { name: 'Student Gateway', path: '/student/login', icon: GraduationCap },
      { name: 'Coordinator Gateway', path: '/login', icon: LogIn }
    ];
  }

  const isPrintPage = location.pathname.startsWith('/certificate/print/');
  if (isPrintPage) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>{children}</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 100,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer',
          display: 'none',
        }}
        className="mobile-toggle-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Navigation */}
      <aside 
        style={{
          width: sidebarOpen ? '260px' : '0px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          transition: 'var(--transition-smooth)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 90,
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0
        }}
        className="app-sidebar"
      >
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrainCircuit color="var(--primary)" size={28} className="pulse-glow" />
          <div style={{ whiteSpace: 'nowrap' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '700' }}>SANSAH</h2>
            <p style={{ fontSize: '11px', color: 'var(--primary)', letterSpacing: '0.05em', fontWeight: '600' }}>INNOVATIONS</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--primary-glow)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0, 240, 255, 0.2)' : 'transparent'}`,
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'var(--transition-smooth)',
                  whiteSpace: 'nowrap'
                }}
                className="nav-link-item"
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {(isAdminLoggedIn || isStudentLoggedIn) && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '0 8px', whiteSpace: 'nowrap' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: isAdminLoggedIn ? 'var(--secondary)' : 'var(--primary-glow)', 
                color: isAdminLoggedIn ? 'white' : 'var(--primary)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {isAdminLoggedIn ? <Terminal size={16} /> : <GraduationCap size={16} />}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {isAdminLoggedIn ? (adminUser.username || 'Admin') : (studentUser.name || 'Student')}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {isAdminLoggedIn ? (adminUser.role || 'Staff') : (studentUser.email || 'Verified')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '13px', gap: '8px' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar */}
        <header style={{
          height: '70px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px'
        }} className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>
              College Workshop Registration Portal
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              {isAdminLoggedIn ? '🔒 Coordinator Console' : isStudentLoggedIn ? '🎓 Student Account' : '🌐 Guest Portal'}
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }} className="app-main-content">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .app-sidebar {
            position: fixed !important;
            height: 100vh !important;
            width: ${sidebarOpen ? '260px' : '0px'} !important;
          }
          .mobile-toggle-btn {
            display: flex !important;
          }
          .app-header {
            padding: 0 16px 0 64px !important;
          }
          .app-main-content {
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
