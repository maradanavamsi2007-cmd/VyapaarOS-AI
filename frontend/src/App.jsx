import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminWorkshops from './pages/AdminWorkshops';
import ParticipantList from './pages/ParticipantList';
import RegistrationDetails from './pages/RegistrationDetails';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AttendanceManagement from './pages/AttendanceManagement';
import StudentCertificates from './pages/StudentCertificates';
import AdminCertificates from './pages/AdminCertificates';
import VerifyCertificate from './pages/VerifyCertificate';
import CertificatePrint from './pages/CertificatePrint';

// Admin Guard component
function AdminGuard({ children }) {
  const token = localStorage.getItem('sansah_admin_token');
  return token ? children : <Navigate to="/login" replace />;
}

// Student Guard component
function StudentGuard({ children }) {
  const token = localStorage.getItem('sansah_student_token');
  return token ? children : <Navigate to="/student/login" replace />;
}

// Root Redirect Component
function RootRedirect() {
  const adminToken = localStorage.getItem('sansah_admin_token');
  const studentToken = localStorage.getItem('sansah_student_token');
  
  if (adminToken) {
    return <Navigate to="/admin" replace />;
  }
  if (studentToken) {
    return <Navigate to="/student/dashboard" replace />;
  }
  return <Navigate to="/student/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public Visitor Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route 
            path="/workshops" 
            element={
              <StudentGuard>
                <Home />
              </StudentGuard>
            } 
          />
          <Route 
            path="/register" 
            element={
              <StudentGuard>
                <Register />
              </StudentGuard>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/signup" element={<StudentSignup />} />

          {/* Secure Student Portal Routes */}
          <Route 
            path="/student/dashboard" 
            element={
              <StudentGuard>
                <StudentDashboard />
              </StudentGuard>
            } 
          />
          <Route 
            path="/student/certificates" 
            element={
              <StudentGuard>
                <StudentCertificates />
              </StudentGuard>
            } 
          />

          {/* Secure Admin Portal Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            } 
          />
          <Route 
            path="/admin/workshops" 
            element={
              <AdminGuard>
                <AdminWorkshops />
              </AdminGuard>
            } 
          />
          <Route 
            path="/admin/attendance" 
            element={
              <AdminGuard>
                <AttendanceManagement />
              </AdminGuard>
            } 
          />
          <Route 
            path="/admin/certificates" 
            element={
              <AdminGuard>
                <AdminCertificates />
              </AdminGuard>
            } 
          />
          <Route 
            path="/participants" 
            element={
              <AdminGuard>
                <ParticipantList />
              </AdminGuard>
            } 
          />
          <Route 
            path="/registrations/:id" 
            element={
              <AdminGuard>
                <RegistrationDetails />
              </AdminGuard>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <AdminGuard>
                <Reports />
              </AdminGuard>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <AdminGuard>
                <Profile />
              </AdminGuard>
            } 
          />

          {/* Public & Print Routes */}
          <Route path="/verify/:code" element={<VerifyCertificate />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/certificate/print/:code" element={<CertificatePrint />} />

          {/* Catch-all Fallback redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
