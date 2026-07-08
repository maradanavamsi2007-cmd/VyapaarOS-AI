import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import DashboardControl from './pages/DashboardControl';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Visitor Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* SaaS Business Mission Control Dashboard */}
          <Route path="/dashboard" element={<DashboardControl />} />

          {/* Catch-all Fallback redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
