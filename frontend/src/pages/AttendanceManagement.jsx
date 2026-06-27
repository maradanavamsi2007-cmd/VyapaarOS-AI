import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  Calendar, 
  Users, 
  BarChart2, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  QrCode, 
  RefreshCw, 
  Printer, 
  FileSpreadsheet, 
  FileText,
  AlertCircle
} from 'lucide-react';

export default function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState('marking'); // marking, stats, reports
  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState('all');
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  
  // Advanced Filter States
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Data States
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [reportsData, setReportsData] = useState([]);
  const [reportType, setReportType] = useState('daily'); // daily, weekly, workshop
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [reportWorkshop, setReportWorkshop] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk Selection States
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    // Fetch workshops list for filters
    api.getWorkshops()
      .then(res => {
        setWorkshops(res.data || []);
        setSelectedWorkshop('all'); // Default to All Workshops
        if (res.data && res.data.length > 0) {
          setReportWorkshop(res.data[0].workshop_id);
        }
      })
      .catch(err => console.error('Error loading workshops:', err));

    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'marking' && selectedWorkshop) {
      loadStudents();
    }
  }, [selectedWorkshop, selectedDay, selectedDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [reportType, reportWorkshop, reportDate, activeTab]);

  const loadStudents = () => {
    setLoading(true);
    const filters = {
      workshopId: selectedWorkshop,
      dayNumber: selectedDay,
      date: selectedDate,
      search
    };
    api.getAttendanceList(filters)
      .then(res => {
        setStudents(res.data || []);
        setSelectedStudentIds([]); // Reset bulk selection
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching student list:', err);
        setLoading(false);
      });
  };

  const loadStats = () => {
    api.getAttendanceStats()
      .then(res => setStats(res.data))
      .catch(err => console.error('Error fetching stats:', err));
  };

  const loadReports = () => {
    setLoading(true);
    const params = {
      type: reportType,
      workshopId: reportWorkshop,
      date: reportDate
    };
    api.getAttendanceReports(params)
      .then(res => {
        setReportsData(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching reports data:', err);
        setLoading(false);
      });
  };

  // 1. Mark attendance for a single student (passes student-specific workshop ID if selectedWorkshop is 'all')
  const handleMarkStatus = async (studentId, status, studentWorkshopId) => {
    const targetWorkshopId = studentWorkshopId || selectedWorkshop;
    try {
      await api.saveStudentAttendance({
        studentId,
        workshopId: targetWorkshopId,
        dayNumber: selectedDay,
        date: selectedDate,
        status
      });
      
      loadStudents();
      loadStats();
    } catch (err) {
      alert(err.message || 'Failed to update attendance.');
    }
  };

  // 2. Bulk attendance operations (groups by student workshop ID to allow multi-workshop bulk marking)
  const handleBulkMark = async (status) => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student.');
      return;
    }

    try {
      const selectedStudents = students.filter(s => selectedStudentIds.includes(s.student_id));
      const groupedByWorkshop = {};
      
      selectedStudents.forEach(s => {
        if (!groupedByWorkshop[s.workshop_id]) {
          groupedByWorkshop[s.workshop_id] = [];
        }
        groupedByWorkshop[s.workshop_id].push(s.student_id);
      });

      await Promise.all(
        Object.keys(groupedByWorkshop).map(wId => 
          api.saveBulkAttendance({
            studentIds: groupedByWorkshop[wId],
            workshopId: parseInt(wId),
            dayNumber: selectedDay,
            date: selectedDate,
            status
          })
        )
      );

      alert(`Successfully marked ${selectedStudentIds.length} students as ${status}.`);
      loadStudents();
      loadStats();
    } catch (err) {
      alert(err.message || 'Failed to apply bulk attendance.');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.student_id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectRow = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  // 3. Exporter triggers
  const exportToCSV = () => {
    if (reportsData.length === 0) {
      alert('No data available to export.');
      return;
    }

    let headers = [];
    let rows = [];
    let fileName = '';

    if (reportType === 'daily') {
      headers = ['Date', 'Day', 'Student Name', 'Email', 'College', 'Workshop Title', 'Status'];
      rows = reportsData.map(r => [
        r.date,
        `Day ${r.day_number}`,
        `"${r.student_name.replace(/"/g, '""')}"`,
        r.student_email,
        `"${r.college_name.replace(/"/g, '""')}"`,
        `"${r.workshop_title.replace(/"/g, '""')}"`,
        r.status
      ]);
      fileName = `daily_attendance_${reportDate}.csv`;
    } else if (reportType === 'weekly') {
      const selectedW = workshops.find(w => String(w.workshop_id) === String(reportWorkshop));
      const wTitle = selectedW ? selectedW.title : 'Workshop';
      headers = ['Student Name', 'Email', 'College', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Present Days', 'Attendance %'];
      rows = reportsData.map(r => [
        `"${r.student_name.replace(/"/g, '""')}"`,
        r.student_email,
        `"${r.college_name.replace(/"/g, '""')}"`,
        r.day1, r.day2, r.day3, r.day4, r.day5, r.day6, r.day7,
        r.present_count,
        `${r.percentage}%`
      ]);
      fileName = `weekly_attendance_${wTitle.replace(/\s+/g, '_')}.csv`;
    } else {
      headers = ['Workshop ID', 'Workshop Title', 'Trainer', 'Total Sessions Logged', 'Present Logs', 'Absent Logs', 'Avg Attendance %'];
      rows = reportsData.map(r => [
        r.workshop_id,
        `"${r.workshop_title.replace(/"/g, '""')}"`,
        `"${r.trainer_name.replace(/"/g, '""')}"`,
        r.total_marked,
        r.present_count,
        r.absent_count,
        `${r.percentage}%`
      ]);
      fileName = `workshop_attendance_summary.csv`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    // Generate clean CSV which Excel opens naturally
    exportToCSV();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortHeader = (label, field) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        className="sortable-header"
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>{label}</span>
          <span style={{ fontSize: '10px', opacity: isSorted ? 1 : 0.3 }}>
            {isSorted ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
          </span>
        </div>
      </th>
    );
  };

  // Extract unique departments and years/semesters for filter dropdowns
  const departments = [...new Set(students.map(s => s.branch).filter(Boolean))].sort();
  const years = [...new Set(students.map(s => s.semester).filter(Boolean))].sort();

  const filteredStudents = students.filter(s => {
    // 1. Department (branch) filter
    if (selectedDepartment && selectedDepartment !== 'all') {
      if (s.branch !== selectedDepartment) return false;
    }

    // 2. Year (semester) filter
    if (selectedYear && selectedYear !== 'all') {
      if (s.semester !== selectedYear) return false;
    }

    // 3. Attendance status filter
    if (selectedStatus && selectedStatus !== 'all') {
      if (s.status !== selectedStatus) return false;
    }

    // 4. Search query filter
    if (!search) return true;
    const sLower = search.trim().toLowerCase().replace(/\s+/g, ' ');
    return (
      String(s.student_id).includes(sLower) ||
      s.name.toLowerCase().includes(sLower) ||
      s.email.toLowerCase().includes(sLower) ||
      (s.branch && s.branch.toLowerCase().includes(sLower)) ||
      (s.semester && s.semester.toLowerCase().includes(sLower)) ||
      (s.college_name && s.college_name.toLowerCase().includes(sLower)) ||
      (s.workshop_title && s.workshop_title.toLowerCase().includes(sLower))
    );
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return sortOrder === 'asc' 
        ? valA - valB 
        : valB - valA;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="attendance-page-wrapper">
      
      {/* Header title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>Attendance Management</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Configure 7-Day student records, inspect weekly percentages, and compile attendance analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setQrModalOpen(true)} 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
          >
            <QrCode size={14} color="var(--primary)" />
            <span>Attendance QR Console</span>
          </button>
          <button 
            onClick={() => { loadStats(); if(activeTab==='marking') loadStudents(); else loadReports(); }} 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px' }}
            title="Refresh current dataset"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('marking')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'marking' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'marking' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '-1px'
          }}
        >
          Attendance Registrar
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'stats' ? '2px solid var(--secondary)' : '2px solid transparent',
            color: activeTab === 'stats' ? 'var(--secondary)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '-1px'
          }}
        >
          Analytics & Trends
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '2px solid var(--success)' : '2px solid transparent',
            color: activeTab === 'reports' ? 'var(--success)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '-1px'
          }}
        >
          Reports & Export
        </button>
      </div>

      {/* TAB 1: ATTENDANCE MARKING */}
      {activeTab === 'marking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Controls bar */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '11px' }}>Select Workshop</label>
                <select 
                  value={selectedWorkshop} 
                  onChange={(e) => setSelectedWorkshop(e.target.value)}
                >
                  <option value="all">All Workshops</option>
                  {workshops.map(w => (
                    <option key={w.workshop_id} value={w.workshop_id}>{w.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Department</label>
                <select 
                  value={selectedDepartment} 
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Year / Semester</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="all">All Years/Semesters</option>
                  {years.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Attendance Status</label>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Attendance Date</label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px' }}>Search Student</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Search name/ID/email..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                </div>
              </div>
            </div>

            {/* Day selector buttons (1-7) */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <label style={{ fontSize: '11px', marginBottom: '10px' }}>Workshop Program Day (1 to 7)</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: selectedDay === day ? 'var(--primary)' : 'var(--border-color)',
                      background: selectedDay === day ? 'var(--primary-glow)' : 'rgba(15,23,42,0.4)',
                      color: selectedDay === day ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk actions and Student List table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', margin: 0 }}>Registered Students Registry</h3>
              
              {/* Bulk Marking Control */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedStudentIds.length} selected
                </span>
                <button 
                  onClick={() => handleBulkMark('Present')}
                  className="btn btn-indigo"
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                  disabled={selectedStudentIds.length === 0}
                >
                  <CheckCircle2 size={12} />
                  <span>Mark Present</span>
                </button>
                <button 
                  onClick={() => handleBulkMark('Absent')}
                  className="btn btn-danger"
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                  disabled={selectedStudentIds.length === 0}
                >
                  <XCircle size={12} />
                  <span>Mark Absent</span>
                </button>
                <button 
                  onClick={() => handleBulkMark('Late')}
                  className="btn btn-warning"
                  style={{ 
                    padding: '8px 14px', 
                    fontSize: '12px', 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    color: 'rgb(245, 158, 11)', 
                    borderColor: 'rgba(245, 158, 11, 0.3)' 
                  }}
                  disabled={selectedStudentIds.length === 0}
                >
                  <Clock size={12} />
                  <span>Mark Late</span>
                </button>
              </div>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>Loading registry list...</p>
            ) : students.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>No approved students found.</p>
            ) : filteredStudents.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>No students match the selected filters or search query.</p>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '13px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll} 
                          checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </th>
                      {renderSortHeader('Student ID', 'student_id')}
                      {renderSortHeader('Student Name', 'name')}
                      {renderSortHeader('Email', 'email')}
                      {renderSortHeader('Department', 'branch')}
                      {renderSortHeader('Year', 'semester')}
                      {renderSortHeader('Workshop', 'workshop_title')}
                      {renderSortHeader('Verification Status', 'confirmation_status')}
                      {renderSortHeader('Attendance Status', 'status')}
                      <th>Attendance Date</th>
                      {renderSortHeader('Attendance Time', 'marked_time')}
                      {renderSortHeader('Present Days', 'present_days_count')}
                      {renderSortHeader('Attendance %', 'attendance_percentage')}
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map(s => {
                      const isSelected = selectedStudentIds.includes(s.student_id);
                      return (
                        <tr key={`${s.student_id}_${s.workshop_id}`} style={{ background: isSelected ? 'rgba(0,240,255,0.02)' : 'transparent' }}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleSelectRow(s.student_id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>#{s.student_id}</span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{s.name}</strong>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)' }}>{s.email}</span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)' }}>{s.branch}</span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)' }}>{s.semester}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.workshop_title || 'Unknown'}</span>
                          </td>
                          <td>
                            <span className="badge badge-approved" style={{ textTransform: 'capitalize' }}>
                              {s.confirmation_status || 'Approved'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              s.status === 'Present' ? 'badge-approved' : 
                              s.status === 'Absent' ? 'badge-rejected' : 
                              s.status === 'Late' ? 'badge-pending' : 'badge-pending'
                            }`} style={{ 
                              background: s.status === 'Late' ? 'rgba(245, 158, 11, 0.15)' : undefined, 
                              color: s.status === 'Late' ? 'rgb(245, 158, 11)' : undefined,
                              border: s.status === 'Late' ? '1px solid rgba(245, 158, 11, 0.3)' : undefined
                            }}>
                              {s.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.attendance_date}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {s.marked_time ? new Date(s.marked_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{s.present_days_count} / {s.total_days_count}</strong>
                          </td>
                          <td>
                            <span style={{ 
                              fontWeight: '600',
                              color: s.attendance_percentage >= 75 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {s.attendance_percentage}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleMarkStatus(s.student_id, 'Present', s.workshop_id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  background: s.status === 'Present' ? 'var(--success-glow)' : 'transparent',
                                  color: s.status === 'Present' ? 'var(--success)' : 'var(--text-secondary)',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleMarkStatus(s.student_id, 'Absent', s.workshop_id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: s.status === 'Absent' ? 'var(--danger-glow)' : 'transparent',
                                  color: s.status === 'Absent' ? 'var(--danger)' : 'var(--text-secondary)',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => handleMarkStatus(s.student_id, 'Late', s.workshop_id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  background: s.status === 'Late' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                  color: s.status === 'Late' ? 'rgb(245, 158, 11)' : 'var(--text-secondary)',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Late
                              </button>
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
      )}

      {/* TAB 2: ANALYTICS & TRENDS */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Quick Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }} className="grid-cols-12">
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--primary-glow)', borderRadius: '10px', color: 'var(--primary)' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Active Registry</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{stats?.totalStudents || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Approved registered students</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--success-glow)', borderRadius: '10px', color: 'var(--success)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Checked-In Today</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)', marginTop: '2px' }}>{stats?.presentToday || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Students marked as Present</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--danger-glow)', borderRadius: '10px', color: 'var(--danger)' }}>
                <XCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Absent Today</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)', marginTop: '2px' }}>{stats?.absentToday || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Students marked as Absent</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', color: 'var(--accent-purple)' }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Overall Presence</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{stats?.overallPercentage || 0}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Average attendance ratio</div>
              </div>
            </div>
          </div>

          {/* Weekly and Workshop distributions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="grid-cols-12">
            {/* Weekly checklist chart */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--primary)" />
                <span>Weekly Attendance Summary (Checkins by Day)</span>
              </h3>

              {stats?.weeklySummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.keys(stats.weeklySummary).map(dayKey => {
                    const data = stats.weeklySummary[dayKey];
                    const totalMarked = data.present + data.absent;
                    const presentPercent = totalMarked > 0 ? Math.round((data.present / totalMarked) * 100) : 0;
                    return (
                      <div key={dayKey} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ fontWeight: '600' }}>{dayKey}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Present: <strong style={{ color: 'var(--success)' }}>{data.present}</strong> | Absent: <strong style={{ color: 'var(--danger)' }}>{data.absent}</strong> ({presentPercent}%)
                          </span>
                        </div>
                        {/* Custom visual progress bar stack */}
                        <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', display: 'flex', overflow: 'hidden' }}>
                          <div style={{ width: `${totalMarked > 0 ? (data.present / totalMarked) * 100 : 0}%`, height: '100%', background: 'var(--success)' }} />
                          <div style={{ width: `${totalMarked > 0 ? (data.absent / totalMarked) * 100 : 0}%`, height: '100%', background: 'var(--danger)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No weekly log summaries compileable.</p>
              )}
            </div>

            {/* Trends by workshop */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="var(--secondary)" />
                <span>Attendance Fill Trends by Workshop</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {stats?.workshopTrends && stats.workshopTrends.length > 0 ? (
                  stats.workshopTrends.map(trend => (
                    <div key={trend.workshop_id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{trend.title}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Avg: <strong>{trend.percentage}%</strong></span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${trend.percentage}%`, 
                          height: '100%', 
                          background: trend.percentage >= 75 ? 'var(--success)' : trend.percentage >= 50 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: '4px',
                          transition: 'var(--transition-smooth)'
                        }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No metrics trend logs available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS & EXPORT */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Controls bar */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr auto', gap: '16px', alignItems: 'end' }} className="grid-cols-12">
              <div>
                <label style={{ fontSize: '11px' }}>Report Dimension</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="daily">Daily Attendance Report</option>
                  <option value="weekly">Weekly Workshop Tracker (Grid)</option>
                  <option value="workshop">Workshop-wise Summary</option>
                </select>
              </div>

              {reportType === 'weekly' && (
                <div>
                  <label style={{ fontSize: '11px' }}>Workshop Selection</label>
                  <select value={reportWorkshop} onChange={(e) => setReportWorkshop(e.target.value)}>
                    {workshops.map(w => (
                      <option key={w.workshop_id} value={w.workshop_id}>{w.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportType === 'daily' && (
                <div>
                  <label style={{ fontSize: '11px' }}>Calendar Date</label>
                  <input 
                    type="date" 
                    value={reportDate} 
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
              )}

              {reportType === 'workshop' && <div />} {/* Empty placeholder space */}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={loadReports} className="btn btn-primary" style={{ padding: '12px' }}>
                  Compile
                </button>
              </div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="grid-cols-12">
            <button onClick={exportToCSV} className="btn btn-indigo" style={{ padding: '12px', fontSize: '13px', gap: '8px' }}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button onClick={exportToExcel} className="btn btn-secondary" style={{ padding: '12px', fontSize: '13px', gap: '8px' }}>
              <FileSpreadsheet size={14} color="var(--success)" />
              <span>Export Excel</span>
            </button>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '12px', fontSize: '13px', gap: '8px' }}>
              <Printer size={14} color="var(--primary)" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          {/* Table display */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Report compiled: {reportType === 'daily' ? `Daily checks for ${reportDate}` : reportType === 'weekly' ? 'Weekly program grid (Days 1-7)' : 'Workshop-wise presence averages'}
            </h3>

            {loading ? (
              <p style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>Compiling report matrices...</p>
            ) : reportsData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>No log entries compiled for current filters.</p>
            ) : (
              <div className="table-container">
                {/* 1. DAILY REPORT TABLE */}
                {reportType === 'daily' && (
                  <table className="custom-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day No.</th>
                        <th>Student Name</th>
                        <th>College</th>
                        <th>Workshop Course</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.map(r => (
                        <tr key={r.id}>
                          <td>{r.date}</td>
                          <td>Day {r.day_number}</td>
                          <td>
                            <strong>{r.student_name}</strong>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.student_email}</div>
                          </td>
                          <td>{r.college_name}</td>
                          <td>{r.workshop_title}</td>
                          <td>
                            <span className={`badge ${r.status === 'Present' ? 'badge-approved' : 'badge-rejected'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 2. WEEKLY GRID REPORT */}
                {reportType === 'weekly' && (
                  <table className="custom-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Student Details</th>
                        <th>Day 1</th>
                        <th>Day 2</th>
                        <th>Day 3</th>
                        <th>Day 4</th>
                        <th>Day 5</th>
                        <th>Day 6</th>
                        <th>Day 7</th>
                        <th>Present</th>
                        <th>Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.map(r => (
                        <tr key={r.student_id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{r.student_name}</strong>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.college_name}</div>
                          </td>
                          {['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'].map(dKey => {
                            const status = r[dKey];
                            return (
                              <td key={dKey}>
                                <span style={{
                                  color: status === 'Present' ? 'var(--success)' : status === 'Absent' ? 'var(--danger)' : 'var(--warning)',
                                  fontSize: '14px',
                                  fontWeight: '700'
                                }}>
                                  {status === 'Present' ? '●' : status === 'Absent' ? '○' : '-'}
                                </span>
                              </td>
                            );
                          })}
                          <td><strong>{r.present_count}/7</strong></td>
                          <td>
                            <span style={{ 
                              color: r.percentage >= 75 ? 'var(--success)' : 'var(--danger)',
                              fontWeight: '600'
                            }}>
                              {r.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 3. WORKSHOP SUMMARY REPORT */}
                {reportType === 'workshop' && (
                  <table className="custom-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Workshop Title</th>
                        <th>Trainer Name</th>
                        <th>Total Checks Logged</th>
                        <th>Present Counts</th>
                        <th>Absent Counts</th>
                        <th>Presence Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.map(r => (
                        <tr key={r.workshop_id}>
                          <td>#{r.workshop_id}</td>
                          <td><strong>{r.workshop_title}</strong></td>
                          <td>{r.trainer_name}</td>
                          <td>{r.total_marked} checks</td>
                          <td style={{ color: 'var(--success)' }}>{r.present_count} present</td>
                          <td style={{ color: 'var(--danger)' }}>{r.absent_count} absent</td>
                          <td>
                            <span style={{ 
                              fontWeight: '700',
                              color: r.percentage >= 75 ? 'var(--success)' : r.percentage >= 50 ? 'var(--warning)' : 'var(--danger)'
                            }}>
                              {r.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINTABLE SHEETS FOR PDF MEDIA GENERATION */}
      <div className="printable-attendance-sheet" style={{ display: 'none' }}>
        <div style={{ padding: '40px', color: '#000', background: '#fff' }}>
          <h2 style={{ fontSize: '22px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>Sansah Innovations - Workshop Attendance Log</h2>
          <p style={{ fontSize: '11px', margin: '4px 0 20px 0' }}>Report generated on: {new Date().toLocaleString('en-IN')}</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Student Name</th>
                <th style={{ padding: '6px' }}>College</th>
                <th style={{ padding: '6px' }}>Workshop Title</th>
                {reportType === 'weekly' ? (
                  <>
                    <th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th><th>D6</th><th>D7</th>
                    <th>Pres</th>
                    <th>%</th>
                  </>
                ) : (
                  <>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {reportsData.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{r.student_name}</td>
                  <td style={{ padding: '6px' }}>{r.college_name}</td>
                  <td style={{ padding: '6px' }}>{r.workshop_title}</td>
                  {reportType === 'weekly' ? (
                    <>
                      <td>{r.day1 === 'Present' ? 'P' : r.day1 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.day2 === 'Present' ? 'P' : r.day2 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.day3 === 'Present' ? 'P' : r.day3 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.day4 === 'Present' ? 'P' : r.day4 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.day5 === 'Present' ? 'P' : r.day5 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.day6 === 'Present' ? 'P' : r.day6 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.day7 === 'Present' ? 'P' : r.day7 === 'Absent' ? 'A' : '-'}</td>
                      <td>{r.present_count}</td>
                      <td>{r.percentage}%</td>
                    </>
                  ) : (
                    <>
                      <td>{r.day_number ? `Day ${r.day_number}` : '-'}</td>
                      <td>{r.date || '-'}</td>
                      <td style={{ fontWeight: '600' }}>{r.status}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR MODAL DIALOG */}
      {qrModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-secondary)',
            padding: '28px',
            position: 'relative',
            textAlign: 'center',
            borderColor: 'var(--primary)'
          }}>
            <button 
              onClick={() => setQrModalOpen(false)}
              style={{
                position: 'absolute', right: '16px', top: '16px',
                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <XCircle size={20} />
            </button>

            <QrCode size={96} color="var(--primary)" style={{ margin: '0 auto 20px auto', filter: 'drop-shadow(0 0 10px var(--primary-glow))' }} />
            
            <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Attendance Verification Terminal</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              Generate a unique token code to allow students to scan and log their attendance for Day {selectedDay} of the workshop.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MOCK ENVELOPE VERIFICATION CODE</div>
              <code style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.1em' }}>
                SANSAH-ATT-{selectedWorkshop}-D{selectedDay}-{selectedDate.replace(/-/g, '')}
              </code>
            </div>

            <button 
              onClick={() => { alert('Token copied! Ready to deploy to classroom display.'); setQrModalOpen(false); }}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Copy Verification Token
            </button>
          </div>
        </div>
      )}

      {/* Global CSS overrides for clean window print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: #fff !important;
            color: #000 !important;
          }
          .printable-attendance-sheet, .printable-attendance-sheet * {
            visibility: visible;
          }
          .printable-attendance-sheet {
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
