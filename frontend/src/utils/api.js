import { supabase } from './supabaseClient';

// Helper to hash passwords using native browser Web Crypto API (SHA-256)
async function hashPassword(password) {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Client-side certificate generation helper matching backend evaluation logic
async function checkAndGenerateCertificateClient(registrationId) {
  try {
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (regErr || !reg || reg.confirmation_status !== 'Approved') return;

    const { data: attRecords, error: attErr } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('student_id', reg.student_id)
      .eq('workshop_id', reg.workshop_id);

    if (attErr || !attRecords) return;

    const presentCount = attRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const attendancePercentage = (presentCount / 7) * 100;
    if (attendancePercentage < 90) return;

    const { data: ws, error: wsErr } = await supabase
      .from('workshops')
      .select('*')
      .eq('workshop_id', reg.workshop_id)
      .maybeSingle();

    if (wsErr || !ws || ws.status !== 'Completed') return;

    // Check if certificate already exists
    const { data: existCert, error: certErr } = await supabase
      .from('certificates')
      .select('*')
      .eq('registration_id', registrationId);

    if (certErr || (existCert && existCert.length > 0)) return;

    const randomHex = Math.floor(100000 + Math.random() * 900000);
    const certCode = `SANSAH-WS-${randomHex}`;
    const downloadUrl = `/api/certificates/download/${certCode}`;

    await supabase.from('certificates').insert({
      registration_id: registrationId,
      certificate_code: certCode,
      download_url: downloadUrl,
      issue_date: new Date().toISOString(),
      status: 'Issued'
    });

    await supabase.from('registration_status_history').insert({
      registration_id: registrationId,
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'System',
      remarks: `Certificate auto-issued on eligibility verification. Code: ${certCode}`
    });
  } catch (e) {
    console.error('Error auto-generating certificate client-side:', e);
  }
}

export const api = {
  // Workshops
  getWorkshops: async () => {
    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .order('workshop_id', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  },

  updateWorkshopStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('workshops')
      .update({ status })
      .eq('workshop_id', id)
      .select();
    if (error) throw error;
    return { success: true, data };
  },

  // Student Registrations
  submitRegistration: async (formData) => {
    const {
      name,
      collegeName,
      city,
      state,
      email,
      phone,
      branch,
      semester,
      workshopId,
      isGroup = false,
      teamName = '',
      members = []
    } = formData;

    if (!name || !collegeName || !email || !phone || !workshopId || !branch || !semester) {
      throw new Error('All student details and workshop selection are required.');
    }

    // 1. Check if workshop is active
    const { data: ws, error: wsErr } = await supabase
      .from('workshops')
      .select('*')
      .eq('workshop_id', workshopId)
      .maybeSingle();

    if (wsErr || !ws) throw new Error('Selected workshop does not exist.');
    if (ws.status === 'Suspended') throw new Error('This workshop has been suspended and is not accepting registrations.');
    if (ws.status === 'Full') throw new Error('This workshop is already full.');

    // 2. Resolve College (Find or Create)
    let collegeId;
    const cleanCollegeName = collegeName.trim();
    const { data: cols, error: colErr } = await supabase
      .from('colleges')
      .select('college_id')
      .eq('name', cleanCollegeName);

    if (colErr) throw colErr;

    if (cols && cols.length > 0) {
      collegeId = cols[0].college_id;
    } else {
      const { data: newCol, error: newColErr } = await supabase
        .from('colleges')
        .insert({
          name: cleanCollegeName,
          city: city || 'Unknown',
          state: state || 'Unknown'
        })
        .select('college_id')
        .single();

      if (newColErr) throw newColErr;
      collegeId = newCol.college_id;
    }

    // 3. Resolve Student (Leader/Individual) (Find or Create)
    let studentId;
    const cleanEmail = email.trim().toLowerCase();
    const { data: studs, error: studErr } = await supabase
      .from('students')
      .select('student_id')
      .eq('email', cleanEmail);

    if (studErr) throw studErr;

    if (studs && studs.length > 0) {
      studentId = studs[0].student_id;
      // Update details to match current submission
      const { error: updErr } = await supabase
        .from('students')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          college_id: collegeId,
          branch,
          semester
        })
        .eq('student_id', studentId);

      if (updErr) throw updErr;
    } else {
      const { data: newStud, error: newStudErr } = await supabase
        .from('students')
        .insert({
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          college_id: collegeId,
          branch,
          semester
        })
        .select('student_id')
        .single();

      if (newStudErr) throw newStudErr;
      studentId = newStud.student_id;
    }

    // 4. Duplicate Registration check for leader/individual
    const { data: dups, error: dupErr } = await supabase
      .from('registrations')
      .select('registration_id')
      .eq('student_id', studentId)
      .eq('workshop_id', workshopId);

    if (dupErr) throw dupErr;
    if (dups && dups.length > 0) {
      throw new Error(`Student with email '${email}' is already registered for the ${ws.title} workshop.`);
    }

    // 5. Duplicate check for group members
    if (isGroup && members && members.length > 0) {
      for (const member of members) {
        const memEmail = member.email.trim().toLowerCase();
        
        const { data: existingStudent, error: exSErr } = await supabase
          .from('students')
          .select('student_id')
          .eq('email', memEmail);

        if (exSErr) throw exSErr;

        if (existingStudent && existingStudent.length > 0) {
          const { data: mDups, error: mDupErr } = await supabase
            .from('registrations')
            .select('registration_id')
            .eq('student_id', existingStudent[0].student_id)
            .eq('workshop_id', workshopId);

          if (mDupErr) throw mDupErr;
          if (mDups && mDups.length > 0) {
            throw new Error(`Team member with email '${member.email}' is already registered for this workshop.`);
          }
        }

        const { data: memberTeams, error: mtErr } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('student_email', memEmail);

        if (mtErr) throw mtErr;

        if (memberTeams && memberTeams.length > 0) {
          for (const mt of memberTeams) {
            const { data: regCheck, error: regChErr } = await supabase
              .from('registrations')
              .select('registration_id')
              .eq('team_id', mt.team_id)
              .eq('workshop_id', workshopId);

            if (regChErr) throw regChErr;
            if (regCheck && regCheck.length > 0) {
              throw new Error(`Team member with email '${member.email}' is already registered in another team for this workshop.`);
            }
          }
        }
      }
    }

    // 6. Handle Team Creation if Group Registration
    let teamId = null;
    if (isGroup) {
      const finalTeamName = teamName.trim() || `${name}'s Team`;
      const memberCount = members.length + 1;

      const { data: newTeam, error: newTeamErr } = await supabase
        .from('teams')
        .insert({
          team_name: finalTeamName,
          leader_student_id: studentId,
          member_count: memberCount
        })
        .select('team_id')
        .single();

      if (newTeamErr) throw newTeamErr;
      teamId = newTeam.team_id;

      if (members && members.length > 0) {
        const membersToInsert = members.map(m => ({
          team_id: teamId,
          student_name: m.name.trim(),
          student_email: m.email.trim().toLowerCase(),
          student_phone: m.phone.trim()
        }));

        const { error: memsErr } = await supabase
          .from('team_members')
          .insert(membersToInsert);

        if (memsErr) throw memsErr;
      }
    }

    // 7. Insert Registration
    const { data: newReg, error: newRegErr } = await supabase
      .from('registrations')
      .insert({
        student_id: studentId,
        workshop_id: workshopId,
        team_id: teamId,
        payment_status: 'Pending',
        confirmation_status: 'Pending'
      })
      .select('registration_id')
      .single();

    if (newRegErr) throw newRegErr;
    const registrationId = newReg.registration_id;

    // 8. Insert History Record
    const { error: histErr } = await supabase
      .from('registration_status_history')
      .insert({
        registration_id: registrationId,
        previous_status: null,
        new_status: 'Pending',
        changed_by: 'System',
        remarks: 'Online registration submitted. Awaiting verification and payment completion.'
      });

    if (histErr) throw histErr;

    // Double check Row verification
    const { data: verifyRow } = await supabase
      .from('registrations')
      .select('registration_id')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (!verifyRow) {
      throw new Error('Supabase database transaction verification failed. Row not found.');
    }

    return {
      success: true,
      message: 'Registration submitted successfully!',
      data: {
        registrationId,
        studentId,
        workshopId,
        teamId
      }
    };
  },

  getRegistrationDetails: async (id) => {
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', id)
      .maybeSingle();

    if (regErr || !reg) throw new Error('Registration not found.');

    const [studentRes, workshopRes, teamRes, teamMembersRes, historyRes, attendanceRes, submissionsRes, certificatesRes] = await Promise.all([
      supabase.from('students').select('*').eq('student_id', reg.student_id).maybeSingle(),
      supabase.from('workshops').select('*').eq('workshop_id', reg.workshop_id).maybeSingle(),
      reg.team_id ? supabase.from('teams').select('*').eq('team_id', reg.team_id).maybeSingle() : Promise.resolve({ data: null }),
      reg.team_id ? supabase.from('team_members').select('*').eq('team_id', reg.team_id) : Promise.resolve({ data: [] }),
      supabase.from('registration_status_history').select('*').eq('registration_id', id).order('changed_at', { ascending: false }),
      supabase.from('attendance_records').select('*').eq('registration_id', id).order('session_date', { ascending: true }),
      supabase.from('project_submissions').select('*').eq('registration_id', id).order('submission_date', { ascending: false }),
      supabase.from('certificates').select('*').eq('registration_id', id).maybeSingle()
    ]);

    const student = studentRes.data || {};
    let college = {};
    if (student.college_id) {
      const { data: col } = await supabase.from('colleges').select('*').eq('college_id', student.college_id).maybeSingle();
      college = col || {};
    }

    return {
      success: true,
      data: {
        registration_id: reg.registration_id,
        registration_date: reg.registration_date,
        payment_status: reg.payment_status,
        confirmation_status: reg.confirmation_status,
        created_at: reg.created_at,
        student_id: student.student_id,
        student_name: student.name || '',
        student_email: student.email || '',
        student_phone: student.phone || '',
        branch: student.branch || '',
        semester: student.semester || '',
        college_id: college.college_id || null,
        college_name: college.name || '',
        college_city: college.city || '',
        college_state: college.state || '',
        workshop_id: workshopRes.data?.workshop_id || reg.workshop_id,
        workshop_title: workshopRes.data?.title || '',
        workshop_description: workshopRes.data?.description || '',
        workshop_fee: workshopRes.data?.fee || 0,
        trainer_name: workshopRes.data?.trainer_name || '',
        team_id: teamRes.data?.team_id || null,
        team_name: teamRes.data?.team_name || '',
        member_count: teamRes.data?.member_count || 0,
        team_members: teamMembersRes.data || [],
        history: historyRes.data || [],
        attendance: attendanceRes.data || [],
        submissions: submissionsRes.data || [],
        certificate: certificatesRes.data || null
      }
    };
  },

  // Admin Profile & Auth
  adminLogin: async (username, password) => {
    const hashed = await hashPassword(password);
    let coord = null;

    if (username === 'admin') {
      const { data } = await supabase.from('coordinators').select('*').eq('coordinator_id', 1).maybeSingle();
      coord = data;
    } else {
      const { data } = await supabase.from('coordinators').select('*').eq('email', username).maybeSingle();
      coord = data;
    }

    if (!coord || coord.password !== hashed) {
      throw new Error('Invalid username or password');
    }

    const loginTime = new Date().toISOString();
    const history = coord.login_history || [];
    history.unshift(loginTime);
    if (history.length > 20) history.pop();

    await supabase
      .from('coordinators')
      .update({
        last_login: loginTime,
        login_history: history
      })
      .eq('coordinator_id', coord.coordinator_id);

    const user = {
      coordinator_id: coord.coordinator_id,
      name: coord.name,
      email: coord.email,
      role: coord.role || 'Coordinator',
      username: coord.email
    };

    const token = 'mock-jwt-token-for-sansah-innovations-admin';
    localStorage.setItem('sansah_admin_token', token);
    localStorage.setItem('sansah_admin_user', JSON.stringify(user));

    return { success: true, token, user };
  },

  adminGetProfile: async () => {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('coordinator_id', 1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  },

  adminUpdateProfile: async (data) => {
    const { data: updated, error } = await supabase
      .from('coordinators')
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        department: data.department || '',
        notification_settings: data.notification_settings
      })
      .eq('coordinator_id', 1)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: updated };
  },

  adminChangePassword: async (currentPassword, newPassword) => {
    const { data: coord, error: fetchErr } = await supabase
      .from('coordinators')
      .select('password')
      .eq('coordinator_id', 1)
      .single();

    if (fetchErr) throw fetchErr;

    const hashedCurrent = await hashPassword(currentPassword);
    if (coord.password !== hashedCurrent) {
      throw new Error('Incorrect current password');
    }

    const hashedNew = await hashPassword(newPassword);
    const { error: updateErr } = await supabase
      .from('coordinators')
      .update({ password: hashedNew })
      .eq('coordinator_id', 1);

    if (updateErr) throw updateErr;
    return { success: true };
  },

  adminGetRecentActivities: async () => {
    const [histRes, regsRes, studentsRes, workshopsRes] = await Promise.all([
      supabase.from('registration_status_history').select('*').order('changed_at', { ascending: false }).limit(5),
      supabase.from('registrations').select('*'),
      supabase.from('students').select('student_id, name'),
      supabase.from('workshops').select('workshop_id, title')
    ]);

    if (histRes.error) throw histRes.error;

    const history = histRes.data || [];
    const regs = regsRes.data || [];
    const students = studentsRes.data || [];
    const workshops = workshopsRes.data || [];

    const studentMap = {}; students.forEach(s => studentMap[s.student_id] = s.name);
    const workshopMap = {}; workshops.forEach(w => workshopMap[w.workshop_id] = w.title);
    const regMap = {}; regs.forEach(r => {
      regMap[r.registration_id] = {
        studentName: studentMap[r.student_id] || 'Unknown Student',
        workshopTitle: workshopMap[r.workshop_id] || 'Unknown Workshop'
      };
    });

    const resolved = history.map(h => {
      const reg = regMap[h.registration_id] || { studentName: 'System', workshopTitle: '' };
      return {
        ...h,
        studentName: reg.studentName,
        workshopTitle: reg.workshopTitle
      };
    });

    return { success: true, data: resolved };
  },

  getDashboardStats: async () => {
    const [regsRes, workshopsRes, studentsRes, collegesRes] = await Promise.all([
      supabase.from('registrations').select('*'),
      supabase.from('workshops').select('*'),
      supabase.from('students').select('*'),
      supabase.from('colleges').select('*')
    ]);

    if (regsRes.error) throw regsRes.error;

    const registrations = regsRes.data || [];
    const workshops = workshopsRes.data || [];
    const students = studentsRes.data || [];
    const colleges = collegesRes.data || [];

    let totalCount = registrations.length;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    registrations.forEach(r => {
      if (r.confirmation_status === 'Approved') approvedCount++;
      else if (r.confirmation_status === 'Pending') pendingCount++;
      else if (r.confirmation_status === 'Rejected') rejectedCount++;
    });

    const workshopStats = workshops.map(w => {
      const regCount = registrations.filter(r => r.workshop_id === w.workshop_id).length;
      return {
        id: w.workshop_id,
        title: w.title,
        capacity: w.capacity,
        status: w.status,
        count: regCount
      };
    });

    const studentToCollegeMap = {};
    students.forEach(s => { studentToCollegeMap[s.student_id] = s.college_id; });

    const collegeNameMap = {};
    colleges.forEach(c => { collegeNameMap[c.college_id] = c.name; });

    const collegeCounts = {};
    registrations.forEach(r => {
      const colId = studentToCollegeMap[r.student_id];
      if (colId) {
        const colName = collegeNameMap[colId];
        if (colName) collegeCounts[colName] = (collegeCounts[colName] || 0) + 1;
      }
    });

    const collegeStats = Object.keys(collegeCounts).map(name => ({
      name,
      count: collegeCounts[name]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      success: true,
      data: {
        summary: {
          total: totalCount,
          approved: approvedCount,
          pending: pendingCount,
          rejected: rejectedCount
        },
        workshops: workshopStats,
        colleges: collegeStats
      }
    };
  },

  getAllRegistrations: async (filters = {}) => {
    const [regsRes, studentsRes, collegesRes, workshopsRes] = await Promise.all([
      supabase.from('registrations').select('*'),
      supabase.from('students').select('*'),
      supabase.from('colleges').select('*'),
      supabase.from('workshops').select('*')
    ]);

    if (regsRes.error) throw regsRes.error;

    const registrations = regsRes.data || [];
    const students = studentsRes.data || [];
    const colleges = collegesRes.data || [];
    const workshops = workshopsRes.data || [];

    const studentMap = {}; students.forEach(s => { studentMap[s.student_id] = s; });
    const collegeMap = {}; colleges.forEach(c => { collegeMap[c.college_id] = c; });
    const workshopMap = {}; workshops.forEach(w => { workshopMap[w.workshop_id] = w; });

    let result = registrations.map(reg => {
      const student = studentMap[reg.student_id] || {};
      const collegeDetails = collegeMap[student.college_id] || {};
      const workshopDetails = workshopMap[reg.workshop_id] || {};

      return {
        registration_id: reg.registration_id,
        registration_date: reg.registration_date,
        payment_status: reg.payment_status,
        confirmation_status: reg.confirmation_status,
        student_name: student.name || '',
        student_email: student.email || '',
        student_phone: student.phone || '',
        branch: student.branch || '',
        college_name: collegeDetails.name || '',
        workshop_title: workshopDetails.title || '',
        workshop_id: reg.workshop_id
      };
    });

    if (filters.search) {
      const sLower = filters.search.toLowerCase();
      result = result.filter(r =>
        r.student_name.toLowerCase().includes(sLower) ||
        r.student_email.toLowerCase().includes(sLower) ||
        r.college_name.toLowerCase().includes(sLower)
      );
    }

    if (filters.workshop) {
      result = result.filter(r => String(r.workshop_id) === String(filters.workshop));
    }

    if (filters.college) {
      const cLower = filters.college.toLowerCase();
      result = result.filter(r => r.college_name.toLowerCase().includes(cLower));
    }

    if (filters.paymentStatus) {
      result = result.filter(r => r.payment_status === filters.paymentStatus);
    }

    if (filters.confirmationStatus) {
      result = result.filter(r => r.confirmation_status === filters.confirmationStatus);
    }

    result.sort((a, b) => b.registration_date.localeCompare(a.registration_date));
    return { success: true, data: result };
  },

  updateRegistrationStatus: async (id, status, remarks) => {
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', id)
      .single();

    if (regErr) throw regErr;
    const prevStatus = reg.confirmation_status;

    const { error: updErr } = await supabase
      .from('registrations')
      .update({ confirmation_status: status })
      .eq('registration_id', id);

    if (updErr) throw updErr;

    const { error: histErr } = await supabase
      .from('registration_status_history')
      .insert({
        registration_id: id,
        previous_status: prevStatus,
        new_status: status,
        changed_by: 'Admin',
        remarks: remarks || `Status changed from ${prevStatus} to ${status}`
      });

    if (histErr) throw histErr;

    if (status === 'Approved') {
      await checkAndGenerateCertificateClient(id);
    }

    return { success: true, message: `Registration status updated to ${status} successfully` };
  },

  updatePaymentStatus: async (id, status, remarks) => {
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', id)
      .single();

    if (regErr) throw regErr;
    const prevStatus = reg.payment_status;

    const { error: updErr } = await supabase
      .from('registrations')
      .update({ payment_status: status })
      .eq('registration_id', id);

    if (updErr) throw updErr;

    const { error: histErr } = await supabase
      .from('registration_status_history')
      .insert({
        registration_id: id,
        previous_status: prevStatus,
        new_status: status,
        changed_by: 'Admin',
        remarks: remarks || `Payment status updated from ${prevStatus} to ${status}`
      });

    if (histErr) throw histErr;

    if (status === 'Completed' && reg.confirmation_status === 'Pending') {
      const { error: confErr } = await supabase
        .from('registrations')
        .update({ confirmation_status: 'Approved' })
        .eq('registration_id', id);

      if (confErr) throw confErr;

      await supabase.from('registration_status_history').insert({
        registration_id: id,
        previous_status: 'Pending',
        new_status: 'Approved',
        changed_by: 'System',
        remarks: 'Registration auto-approved on payment verification.'
      });

      await checkAndGenerateCertificateClient(id);
    }

    return { success: true, message: `Payment status updated to ${status} successfully` };
  },

  recordAttendance: async (id, date, status) => {
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', id)
      .maybeSingle();

    if (regErr || !reg) throw new Error('Registration not found');

    const { data: existing, error: existErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('registration_id', id)
      .eq('session_date', date);

    if (existErr) throw existErr;

    if (existing && existing.length > 0) {
      const { error: updErr } = await supabase
        .from('attendance_records')
        .update({ status })
        .eq('attendance_id', existing[0].attendance_id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from('attendance_records')
        .insert({
          registration_id: id,
          session_date: date,
          status: status
        });

      if (insErr) throw insErr;
    }

    return { success: true, message: 'Attendance recorded successfully' };
  },

  // 7-Day Program Student Attendance
  getAttendanceList: async (filters = {}) => {
    const { workshopId, dayNumber, date, search = '' } = filters;
    const dayNum = parseInt(dayNumber);
    const targetDate = date || new Date().toISOString().split('T')[0];

    let regsQuery = supabase.from('registrations').select('*').eq('confirmation_status', 'Approved');
    if (workshopId && workshopId !== 'all') {
      regsQuery = regsQuery.eq('workshop_id', parseInt(workshopId));
    }
    const { data: registrations, error: regErr } = await regsQuery;
    if (regErr) throw regErr;
    if (!registrations || registrations.length === 0) {
      return { success: true, data: [] };
    }

    let attQuery = supabase.from('student_attendance').select('*');
    if (workshopId && workshopId !== 'all') {
      attQuery = attQuery.eq('workshop_id', parseInt(workshopId));
    }
    const { data: attendanceRecords } = await attQuery;

    const [workshopsSnapshot, studentsSnapshot, collegesSnapshot] = await Promise.all([
      supabase.from('workshops').select('*'),
      supabase.from('students').select('*'),
      supabase.from('colleges').select('*')
    ]);

    const workshopMap = {};
    workshopsSnapshot.data?.forEach(w => { workshopMap[w.workshop_id] = w.title; });
    const studentMap = {};
    studentsSnapshot.data?.forEach(s => { studentMap[s.student_id] = s; });
    const collegeMap = {};
    collegesSnapshot.data?.forEach(c => { collegeMap[c.college_id] = c; });

    const attendanceMap = {};
    const statsMap = {};
    (attendanceRecords || []).forEach(att => {
      const key = `${att.student_id}_${att.workshop_id}`;
      if (!statsMap[key]) {
        statsMap[key] = { present: 0, late: 0, absent: 0 };
      }
      if (att.status === 'Present') statsMap[key].present++;
      else if (att.status === 'Late') statsMap[key].late++;
      else if (att.status === 'Absent') statsMap[key].absent++;

      if (att.day_number === dayNum) {
        attendanceMap[key] = att;
      }
    });

    let result = registrations.map(reg => {
      const student = studentMap[reg.student_id];
      if (!student) return null;
      const college = collegeMap[student.college_id] || {};
      const attRecord = attendanceMap[`${student.student_id}_${reg.workshop_id}`];
      const stats = statsMap[`${student.student_id}_${reg.workshop_id}`] || { present: 0, late: 0, absent: 0 };
      const attendedCount = stats.present + stats.late;
      const attendancePercentage = parseFloat((attendedCount / 7 * 100).toFixed(2));

      return {
        registration_id: reg.registration_id,
        student_id: student.student_id,
        name: student.name || 'Unknown',
        email: student.email || '',
        phone: student.phone || '',
        branch: student.branch || '',
        semester: student.semester || '',
        college_name: college.name || 'Unknown',
        workshop_id: reg.workshop_id,
        workshop_title: workshopMap[reg.workshop_id] || 'Unknown',
        confirmation_status: reg.confirmation_status || 'Approved',
        status: attRecord ? attRecord.status : 'Pending',
        attendance_date: attRecord ? attRecord.attendance_date : targetDate,
        attendance_id: attRecord ? attRecord.id : null,
        marked_time: attRecord ? (attRecord.updated_at || attRecord.created_at) : null,
        present_days_count: attendedCount,
        total_days_count: 7,
        attendance_percentage: attendancePercentage
      };
    }).filter(Boolean);

    if (search) {
      const sLower = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(sLower) ||
        String(r.student_id).includes(sLower) ||
        r.email.toLowerCase().includes(sLower) ||
        r.branch.toLowerCase().includes(sLower) ||
        r.college_name.toLowerCase().includes(sLower) ||
        r.workshop_title.toLowerCase().includes(sLower)
      );
    }

    return { success: true, data: result };
  },

  saveStudentAttendance: async (data) => {
    const { studentId, workshopId, dayNumber, date, status } = data;
    const dayNum = parseInt(dayNumber);
    const targetDate = date || new Date().toISOString().split('T')[0];
    const sId = parseInt(studentId);
    const wId = parseInt(workshopId);

    const { data: exist, error: existErr } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('student_id', sId)
      .eq('workshop_id', wId)
      .eq('day_number', dayNum);

    if (existErr) throw existErr;

    if (exist && exist.length > 0) {
      const { error: updErr } = await supabase
        .from('student_attendance')
        .update({ status, attendance_date: targetDate, updated_at: new Date().toISOString() })
        .eq('id', exist[0].id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from('student_attendance')
        .insert({
          student_id: sId,
          workshop_id: wId,
          day_number: dayNum,
          attendance_date: targetDate,
          status
        });

      if (insErr) throw insErr;
    }

    const { data: regs } = await supabase
      .from('registrations')
      .select('registration_id')
      .eq('student_id', sId)
      .eq('workshop_id', wId);

    if (regs && regs.length > 0) {
      await checkAndGenerateCertificateClient(regs[0].registration_id);
    }

    return { success: true, message: 'Attendance recorded successfully.' };
  },

  saveBulkAttendance: async (data) => {
    const { studentIds, workshopId, dayNumber, date, status } = data;
    const dayNum = parseInt(dayNumber);
    const targetDate = date || new Date().toISOString().split('T')[0];
    const wId = parseInt(workshopId);

    for (const sId of studentIds) {
      const parsedStudentId = parseInt(sId);
      const { data: exist } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('student_id', parsedStudentId)
        .eq('workshop_id', wId)
        .eq('day_number', dayNum);

      if (exist && exist.length > 0) {
        await supabase
          .from('student_attendance')
          .update({ status, attendance_date: targetDate, updated_at: new Date().toISOString() })
          .eq('id', exist[0].id);
      } else {
        await supabase
          .from('student_attendance')
          .insert({
            student_id: parsedStudentId,
            workshop_id: wId,
            day_number: dayNum,
            attendance_date: targetDate,
            status
          });
      }
    }

    for (const sId of studentIds) {
      const { data: regs } = await supabase
        .from('registrations')
        .select('registration_id')
        .eq('student_id', parseInt(sId))
        .eq('workshop_id', wId);

      if (regs && regs.length > 0) {
        await checkAndGenerateCertificateClient(regs[0].registration_id);
      }
    }

    return { success: true, message: `Bulk attendance recorded for ${studentIds.length} students.` };
  },

  getAttendanceStats: async () => {
    const today = new Date().toISOString().split('T')[0];
    const [regsRes, attRes, workshopsRes] = await Promise.all([
      supabase.from('registrations').select('*').eq('confirmation_status', 'Approved'),
      supabase.from('student_attendance').select('*'),
      supabase.from('workshops').select('*')
    ]);

    if (regsRes.error) throw regsRes.error;
    if (attRes.error) throw attRes.error;

    const registrations = regsRes.data || [];
    const allRecords = attRes.data || [];
    const workshops = workshopsRes.data || [];

    const totalStudents = registrations.length;
    const todayRecords = allRecords.filter(r => r.attendance_date === today);
    const presentToday = todayRecords.filter(r => r.status === 'Present').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;

    const markedCount = allRecords.length;
    const presentCount = allRecords.filter(r => r.status === 'Present').length;
    const overallPercentage = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 100;

    const weeklySummary = {};
    for (let day = 1; day <= 7; day++) {
      const dayRecords = allRecords.filter(r => r.day_number === day);
      const present = dayRecords.filter(r => r.status === 'Present').length;
      const absent = dayRecords.filter(r => r.status === 'Absent').length;
      weeklySummary[`Day ${day}`] = { present, absent };
    }

    const workshopTrends = workshops.map(w => {
      const wRecords = allRecords.filter(r => r.workshop_id === w.workshop_id);
      const wMarked = wRecords.length;
      const wPresent = wRecords.filter(r => r.status === 'Present').length;
      const percentage = wMarked > 0 ? Math.round((wPresent / wMarked) * 100) : 100;
      return {
        workshop_id: w.workshop_id,
        title: w.title,
        present: wPresent,
        absent: wMarked - wPresent,
        percentage
      };
    });

    return {
      success: true,
      data: {
        totalStudents,
        presentToday,
        absentToday,
        overallPercentage,
        weeklySummary,
        workshopTrends
      }
    };
  },

  getAttendanceReports: async (filters = {}) => {
    const { type, workshopId, date } = filters;
    const [workshopsRes, studentsRes, collegesRes, attRes] = await Promise.all([
      supabase.from('workshops').select('*'),
      supabase.from('students').select('*'),
      supabase.from('colleges').select('*'),
      supabase.from('student_attendance').select('*')
    ]);

    const workshops = workshopsRes.data || [];
    const students = studentsRes.data || [];
    const colleges = collegesRes.data || [];
    const allRecords = attRes.data || [];

    const workshopMap = {}; workshops.forEach(w => { workshopMap[w.workshop_id] = w.title; });
    const studentMap = {}; students.forEach(s => { studentMap[s.student_id] = s; });
    const collegeMap = {}; colleges.forEach(c => { collegeMap[c.college_id] = c.name; });

    if (type === 'daily') {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dailyRecords = allRecords.filter(r => r.attendance_date === targetDate);
      const reportData = dailyRecords.map(r => {
        const student = studentMap[r.student_id] || {};
        return {
          id: r.id,
          date: r.attendance_date,
          day_number: r.day_number,
          student_id: r.student_id,
          student_name: student.name || 'Unknown',
          student_email: student.email || '',
          college_name: collegeMap[student.college_id] || 'Unknown',
          workshop_title: workshopMap[r.workshop_id] || 'Unknown',
          status: r.status
        };
      });
      return { success: true, type: 'daily', date: targetDate, data: reportData };
    }

    if (type === 'weekly') {
      if (!workshopId) throw new Error('workshopId is required for weekly report.');
      const wId = parseInt(workshopId);

      const { data: registrations } = await supabase
        .from('registrations')
        .select('*')
        .eq('workshop_id', wId)
        .eq('confirmation_status', 'Approved');

      const wRecords = allRecords.filter(r => r.workshop_id === wId);
      const reportData = (registrations || []).map(reg => {
        const student = studentMap[reg.student_id] || {};
        const studentRecs = wRecords.filter(r => r.student_id === reg.student_id);
        const days = {};
        for (let d = 1; d <= 7; d++) {
          const rec = studentRecs.find(r => r.day_number === d);
          days[`day${d}`] = rec ? rec.status : 'Pending';
        }
        const presentCount = studentRecs.filter(r => r.status === 'Present').length;
        const markedCount = studentRecs.filter(r => r.status === 'Present' || r.status === 'Absent').length;
        const percentage = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

        return {
          student_id: reg.student_id,
          student_name: student.name || 'Unknown',
          student_email: student.email || '',
          college_name: collegeMap[student.college_id] || 'Unknown',
          workshop_title: workshopMap[wId] || 'Unknown',
          ...days,
          present_count: presentCount,
          percentage
        };
      });

      return { success: true, type: 'weekly', workshop_title: workshopMap[wId], data: reportData };
    }

    const reportData = workshops.map(w => {
      const wRecords = allRecords.filter(r => r.workshop_id === w.workshop_id);
      const totalCount = wRecords.length;
      const presentCount = wRecords.filter(r => r.status === 'Present').length;
      const absentCount = totalCount - presentCount;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

      return {
        workshop_id: w.workshop_id,
        workshop_title: w.title,
        trainer_name: w.trainer_name || 'TBA',
        total_marked: totalCount,
        present_count: presentCount,
        absent_count: absentCount,
        percentage
      };
    });

    return { success: true, type: 'workshop', data: reportData };
  },

  submitProject: async (id, projectData) => {
    const { data: exist, error: existErr } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('registration_id', id)
      .maybeSingle();

    if (existErr) throw existErr;

    if (exist) {
      const { error: updErr } = await supabase
        .from('project_submissions')
        .update({
          project_title: projectData.projectTitle,
          description: projectData.description || '',
          submission_link: projectData.submissionLink,
          score: projectData.score !== undefined && projectData.score !== null ? parseInt(projectData.score) : null,
          remarks: projectData.remarks || ''
        })
        .eq('submission_id', exist.submission_id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from('project_submissions')
        .insert({
          registration_id: id,
          project_title: projectData.projectTitle,
          description: projectData.description || '',
          submission_link: projectData.submissionLink,
          score: projectData.score !== undefined && projectData.score !== null ? parseInt(projectData.score) : null,
          remarks: projectData.remarks || '',
          submission_date: new Date().toISOString()
        });

      if (insErr) throw insErr;
    }

    return { success: true, message: 'Project submission saved successfully' };
  },

  issueCertificate: async (id) => {
    // Check eligibility
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', id)
      .maybeSingle();

    if (regErr || !reg) throw new Error('Registration not found.');
    if (reg.confirmation_status !== 'Approved') {
      throw new Error('Certificates can only be issued for approved registrations.');
    }

    const { data: attRecords } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('student_id', reg.student_id)
      .eq('workshop_id', reg.workshop_id);

    const presentCount = (attRecords || []).filter(r => r.status === 'Present' || r.status === 'Late').length;
    const attendancePercentage = (presentCount / 7) * 100;
    if (attendancePercentage < 90) {
      throw new Error(`Ineligible for certificate: Student attendance is only ${Math.round(attendancePercentage)}% (Present for ${presentCount}/7 days). Min 90% (7 days) is required.`);
    }

    const { data: ws } = await supabase
      .from('workshops')
      .select('*')
      .eq('workshop_id', reg.workshop_id)
      .maybeSingle();

    if (ws && ws.status !== 'Completed') {
      throw new Error('Ineligible for certificate: Workshop status must be Completed.');
    }

    const { data: existCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('registration_id', id)
      .maybeSingle();

    if (existCert) {
      return { success: true, message: 'Certificate already issued', data: existCert };
    }

    const randomHex = Math.floor(100000 + Math.random() * 900000);
    const certCode = `SANSAH-WS-${randomHex}`;
    const downloadUrl = `/api/certificates/download/${certCode}`;

    const { data: newCert, error: insErr } = await supabase
      .from('certificates')
      .insert({
        registration_id: id,
        certificate_code: certCode,
        download_url: downloadUrl,
        issue_date: new Date().toISOString(),
        status: 'Issued'
      })
      .select()
      .single();

    if (insErr) throw insErr;

    await supabase.from('registration_status_history').insert({
      registration_id: id,
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Admin',
      remarks: `Certificate issued. Code: ${certCode}`
    });

    return {
      success: true,
      message: 'Certificate issued successfully',
      data: newCert
    };
  },

  // AI Service Simulation Fallback (Pure Client-side, zero server dependencies)
  generateConfirmation: async (id) => {
    const { data: reg } = await supabase.from('registrations').select('*').eq('registration_id', id).maybeSingle();
    const { data: student } = reg ? await supabase.from('students').select('*').eq('student_id', reg.student_id).maybeSingle() : { data: null };
    const { data: ws } = reg ? await supabase.from('workshops').select('*').eq('workshop_id', reg.workshop_id).maybeSingle() : { data: null };
    const { data: team } = reg && reg.team_id ? await supabase.from('teams').select('*').eq('team_id', reg.team_id).maybeSingle() : { data: null };

    const text = `Subject: Welcome to Sansah Innovations - Registration Confirmed for ${ws?.title || 'Workshop'}!

Dear ${student?.name || 'Student'},

Thank you for choosing Sansah Innovations! We are excited to confirm that we have received your registration for the upcoming hands-on workshop on **${ws?.title || 'Workshop'}**.

Here are your registration details:
*   **Registration Reference:** SANSAH-REG-${id}
*   **Selected Topic:** ${ws?.title || 'Workshop'}
*   **Registration Mode:** ${team?.team_name ? `Group Registration (${team.team_name})` : 'Individual Entry'}
*   **Course Fee:** INR ${ws?.fee || '0'}
*   **Verification Status:** Pending Verification

**What Happens Next?**
Our admissions team is verifying your payment details. Once confirmed, you will receive your official digital entry ticket and workshop schedule via email.

If you have any questions or require immediate support, please contact our help desk at support@sansahinnovations.com.

Warm regards,
**Sansah Innovations Team**
Learning, Building, and Innovating.`;

    return { success: true, data: text };
  },

  generateJoiningInstructions: async (id) => {
    const { data: reg } = await supabase.from('registrations').select('*').eq('registration_id', id).maybeSingle();
    const { data: student } = reg ? await supabase.from('students').select('*').eq('student_id', reg.student_id).maybeSingle() : { data: null };
    const { data: ws } = reg ? await supabase.from('workshops').select('*').eq('workshop_id', reg.workshop_id).maybeSingle() : { data: null };

    const text = `### Joining Instructions: ${ws?.title || 'Workshop'}
**Conducted by:** ${ws?.trainer_name || 'Instructor'}
**Timings:** 09:30 AM - 04:30 PM (IST)
**Location:** Sansah Innovations Tech Center (or Live Stream Link via Dashboard)

Dear ${student?.name || 'Student'},

Please review the checklist below to prepare for your upcoming session:

1. **Laptop & Hardware Requirements:**
   - Bring a laptop with at least 8GB RAM, Core i3 or equivalent processor.
   - Ensure you have administrator rights to install device drivers.
   
2. **Software Pre-requisites:**
   - **IoT / Embedded Systems:** Install the latest [Arduino IDE](https://www.arduino.cc/en/software) and download the ESP8266/ESP32 core boards manager.
   - **Robotics:** Install [Arduino IDE](https://www.arduino.cc/en/software) and [Fritzing](https://fritzing.org) for circuit designs.
   - **PCB Design:** Install the free version of [KiCAD EDA](https://www.kicad.org) or [Eagle CAD](https://www.autodesk.com/products/eagle/overview).
   - **Smart Home:** Download the [Home Assistant Mobile App](https://www.home-assistant.io) and setup a free Github account.

3. **Workshop Materials & Kits:**
   - Hands-on component kits (development boards, sensors, connection wires) will be provided at the registration desk at 09:00 AM on Day 1.

4. **Code of Conduct:**
   - Please arrive 15 minutes prior to the start time.
   - Active participation in lab exercises is mandatory for certificate eligibility.

If you have any questions or require troubleshooting during installations, reply directly to this message. See you at the workshop!`;

    return { success: true, data: text };
  },

  generateCoordinatorNotes: async (id) => {
    const { data: reg } = await supabase.from('registrations').select('*').eq('registration_id', id).maybeSingle();
    const { data: student } = reg ? await supabase.from('students').select('*').eq('student_id', reg.student_id).maybeSingle() : { data: null };
    const { data: college } = student ? await supabase.from('colleges').select('*').eq('college_id', student.college_id).maybeSingle() : { data: null };
    const { data: ws } = reg ? await supabase.from('workshops').select('*').eq('workshop_id', reg.workshop_id).maybeSingle() : { data: null };

    const text = `Subject: Academic Engagement Status Update: ${college?.name || 'College'} - Sansah Innovations

Dear College Coordinator,

I hope this email finds you well.

We are pleased to inform you that **${student?.name || 'Student'}** from your esteemed institution, **${college?.name || 'College'}**, has registered to attend our upcoming technical workshop on **${ws?.title || 'Workshop'}**. 

We recognize the value of academic-industry engagement and kindly request your support in:
1. **Attendance Leave (OD):** Granting official on-duty leave for the student during the workshop dates.
2. **Institutional Sponsorship:** If multiple students from your campus are attending, we can bundle their registrations under a 15% group discount. 

Could you please coordinate with the student to verify their scheduling? We would be delighted to send a detailed syllabus catalog for your department records if requested.

Thank you for encouraging your students to participate in hands-on industry training.

Sincerely,

**Academic Coordinator Relations**
Sansah Innovations
Tel: +91 944-SANSAH-1
Email: coordinators@sansahinnovations.com`;

    return { success: true, data: text };
  },

  getRecommendations: async (branch, semester, interests) => {
    const branchLower = branch.toLowerCase();
    let primary = '';
    let secondary = '';
    let reasons = '';

    if (branchLower.includes('computer') || branchLower.includes('it') || branchLower.includes('software')) {
      primary = 'IoT (Internet of Things)';
      secondary = 'Smart Home Technologies';
      reasons = `*   **${primary}**: A perfect match for computing majors, blending sensors, network protocols, and cloud storage systems.
*   **${secondary}**: Leverages programming skills in setting up central hubs, custom scripting, and cloud dashboard integrations.`;
    } else if (branchLower.includes('electrical') || branchLower.includes('electronics') || branchLower.includes('ece') || branchLower.includes('embedded')) {
      primary = 'Embedded Systems';
      secondary = 'PCB Design';
      reasons = `*   **${primary}**: Explores microcontroller programming, UART/I2C communication protocols, which directly align with your hardware-focused core subjects.
*   **${secondary}**: Practical knowledge in Altium/KiCAD is one of the highest-demanded core industry skills for hardware development and design engineering.`;
    } else if (branchLower.includes('mechanical') || branchLower.includes('mechatronics') || branchLower.includes('aero') || branchLower.includes('robot')) {
      primary = 'Robotics';
      secondary = 'Embedded Systems';
      reasons = `*   **${primary}**: Bridges mechanical kinematics with motor driver operations and PID code adjustments using Arduino controller boards.
*   **${secondary}**: Provides the foundational programming knowledge for controller design, sensor reading, and firmware structure.`;
    } else {
      primary = 'IoT (Internet of Things)';
      secondary = 'Robotics';
      reasons = `*   **${primary}**: Highly accessible entry point to modern engineering, combining basic sensor setups with dashboard interfaces.
*   **${secondary}**: Fun and engaging hands-on build experience that integrates basic electronics, coding, and physical chassis assembly.`;
    }

    const text = `Based on your academic profile (${branch}, ${semester}):

${reasons}

**Recommended Next Step:** Register for either workshop to receive your hardware starter kit and start building!`;

    return { success: true, data: text };
  },

  // Student Auth & Dashboard
  studentSignup: async (data) => {
    const {
      name = 'New Student',
      email,
      phone = '0000000000',
      collegeName = 'Sathyabama Institute of Science and Technology',
      city = 'Unknown',
      state = 'Unknown',
      branch = 'Not specified',
      semester = 'Semester 1',
      password
    } = data;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Check if email already registered
    const { data: existS } = await supabase
      .from('students')
      .select('student_id')
      .eq('email', cleanEmail);

    if (existS && existS.length > 0) {
      throw new Error('Email address is already in use.');
    }

    // Resolve College (Find or Create)
    let collegeId;
    const cleanCollegeName = collegeName.trim();
    const { data: cols } = await supabase
      .from('colleges')
      .select('college_id')
      .eq('name', cleanCollegeName);

    if (cols && cols.length > 0) {
      collegeId = cols[0].college_id;
    } else {
      const { data: newCol, error: colErr } = await supabase
        .from('colleges')
        .insert({
          name: cleanCollegeName,
          city: city || 'Unknown',
          state: state || 'Unknown'
        })
        .select('college_id')
        .single();

      if (colErr) throw colErr;
      collegeId = newCol.college_id;
    }

    // Insert student with SHA256 password hash
    const hashedPassword = await hashPassword(password);
    const { data: newStudent, error: studErr } = await supabase
      .from('students')
      .insert({
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        college_id: collegeId,
        branch,
        semester,
        password: hashedPassword
      })
      .select('student_id')
      .single();

    if (studErr) throw studErr;
    const studentId = newStudent.student_id;

    const user = {
      studentId,
      name: name.trim(),
      email: cleanEmail,
      branch,
      semester
    };

    const token = `mock-student-jwt-token-${studentId}`;
    localStorage.setItem('sansah_student_token', token);
    localStorage.setItem('sansah_student_user', JSON.stringify(user));

    return { success: true, token, user };
  },

  studentLogin: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    
    const { data: student, error: studErr } = await supabase
      .from('students')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (studErr || !student) {
      throw new Error('Invalid email or password.');
    }

    const hashedPassword = await hashPassword(password);
    const isPasswordValid = student.password === password || student.password === hashedPassword;
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    const user = {
      studentId: student.student_id,
      name: student.name,
      email: student.email,
      branch: student.branch,
      semester: student.semester
    };

    const token = `mock-student-jwt-token-${student.student_id}`;
    localStorage.setItem('sansah_student_token', token);
    localStorage.setItem('sansah_student_user', JSON.stringify(user));

    return { success: true, token, user };
  },

  getStudentDashboard: async () => {
    const localUser = JSON.parse(localStorage.getItem('sansah_student_user') || '{}');
    const studentId = localUser.studentId;
    if (!studentId) throw new Error('Student session profile missing.');

    const { data: student, error: studErr } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (studErr || !student) throw new Error('Student profile not found.');

    let collegeName = 'Unknown';
    if (student.college_id) {
      const { data: col } = await supabase
        .from('colleges')
        .select('name')
        .eq('college_id', student.college_id)
        .maybeSingle();
      if (col) collegeName = col.name;
    }
    student.college_name = collegeName;

    const { data: registrations, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('student_id', studentId);

    if (regErr) throw regErr;

    const detailedRegistrations = [];
    for (const reg of registrations) {
      const [workshopRes, teamRes, teamMembersRes, attendanceRes, studentAttendanceRes, submissionsRes, certificatesRes] = await Promise.all([
        supabase.from('workshops').select('*').eq('workshop_id', reg.workshop_id).maybeSingle(),
        reg.team_id ? supabase.from('teams').select('*').eq('team_id', reg.team_id).maybeSingle() : Promise.resolve({ data: null }),
        reg.team_id ? supabase.from('team_members').select('*').eq('team_id', reg.team_id) : Promise.resolve({ data: [] }),
        supabase.from('attendance_records').select('*').eq('registration_id', reg.registration_id).order('session_date', { ascending: true }),
        supabase.from('student_attendance').select('*').eq('student_id', studentId).eq('workshop_id', reg.workshop_id).order('day_number', { ascending: true }),
        supabase.from('project_submissions').select('*').eq('registration_id', reg.registration_id).order('submission_date', { ascending: false }),
        supabase.from('certificates').select('*').eq('registration_id', reg.registration_id).maybeSingle()
      ]);

      const workshop = workshopRes.data || {};
      const team = teamRes.data || {};
      const teamMembers = teamMembersRes.data || [];
      const attendance = attendanceRes.data || [];
      const studentAttendance = studentAttendanceRes.data || [];

      const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
      const lateCount = studentAttendance.filter(a => a.status === 'Late').length;
      const absentCount = studentAttendance.filter(a => a.status === 'Absent').length;
      const attendedCount = presentCount + lateCount;
      const attendancePercentage = parseFloat((attendedCount / 7 * 100).toFixed(2));

      detailedRegistrations.push({
        registration_id: reg.registration_id,
        registration_date: reg.registration_date,
        payment_status: reg.payment_status,
        confirmation_status: reg.confirmation_status,
        workshop_id: reg.workshop_id,
        workshop_title: workshop.title || '',
        workshop_description: workshop.description || '',
        workshop_fee: workshop.fee || 0,
        trainer_name: workshop.trainer_name || '',
        schedule: workshop.schedule || '',
        venue: workshop.venue || '',
        deadline: workshop.deadline || null,
        team_id: reg.team_id || null,
        team_name: team.team_name || '',
        member_count: team.member_count || 0,
        attendance,
        student_attendance: studentAttendance,
        attendance_percentage: attendancePercentage,
        attendance_summary: {
          total_days: 7,
          present_days: presentCount,
          absent_days: absentCount,
          late_days: lateCount,
          attended_days: attendedCount,
          attendance_percentage: attendancePercentage
        },
        submission: submissionsRes.data?.[0] || null,
        certificate: certificatesRes.data && certificatesRes.data.status === 'Issued' ? certificatesRes.data : null,
        team_members: teamMembers
      });
    }

    return {
      success: true,
      data: {
        profile: student,
        registrations: detailedRegistrations
      }
    };
  },

  studentSubmitProject: async (regId, projectData) => {
    const localUser = JSON.parse(localStorage.getItem('sansah_student_user') || '{}');
    const studentId = localUser.studentId;
    if (!studentId) throw new Error('Student session profile missing.');

    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', regId)
      .maybeSingle();

    if (regErr || !reg) throw new Error('Registration record not found.');
    if (reg.student_id !== studentId) throw new Error('You do not have permission to modify this registration.');

    const { data: exist, error: existErr } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('registration_id', regId)
      .maybeSingle();

    if (existErr) throw existErr;

    if (exist) {
      const { error: updErr } = await supabase
        .from('project_submissions')
        .update({
          project_title: projectData.projectTitle,
          description: projectData.description || '',
          submission_link: projectData.submissionLink
        })
        .eq('submission_id', exist.submission_id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from('project_submissions')
        .insert({
          registration_id: regId,
          project_title: projectData.projectTitle,
          description: projectData.description || '',
          submission_link: projectData.submissionLink,
          submission_date: new Date().toISOString()
        });

      if (insErr) throw insErr;
    }

    return { success: true, message: 'Project submission successfully recorded!' };
  },

  // Admin Workshop CRUD
  adminAddWorkshop: async (data) => {
    const { data: exist } = await supabase
      .from('workshops')
      .select('workshop_id')
      .eq('title', data.title.trim());

    if (exist && exist.length > 0) {
      throw new Error('A workshop with this title already exists.');
    }

    const { data: newWs, error: insErr } = await supabase
      .from('workshops')
      .insert({
        title: data.title.trim(),
        description: data.description || '',
        capacity: parseInt(data.capacity),
        status: 'Active',
        fee: parseFloat(data.fee),
        trainer_name: data.trainerName.trim(),
        image_url: data.image_url || null,
        deadline: data.deadline || null,
        schedule: data.schedule || null,
        venue: data.venue || null
      })
      .select('workshop_id')
      .single();

    if (insErr) throw insErr;
    return { success: true, message: 'Workshop added successfully!', data: { workshop_id: newWs.workshop_id } };
  },

  adminEditWorkshop: async (id, data) => {
    const { data: ws, error: wsErr } = await supabase
      .from('workshops')
      .select('*')
      .eq('workshop_id', id)
      .maybeSingle();

    if (wsErr || !ws) throw new Error('Workshop not found');

    const { data: nameExist } = await supabase
      .from('workshops')
      .select('*')
      .eq('title', data.title.trim());

    if (nameExist && nameExist.some(w => String(w.workshop_id) !== String(id))) {
      throw new Error('A workshop with this title already exists.');
    }

    const previousStatus = ws.status;

    const { error: updErr } = await supabase
      .from('workshops')
      .update({
        title: data.title.trim(),
        description: data.description || '',
        capacity: parseInt(data.capacity),
        status: data.status || 'Active',
        fee: parseFloat(data.fee),
        trainer_name: data.trainerName.trim(),
        image_url: data.image_url || null,
        deadline: data.deadline || null,
        schedule: data.schedule || null,
        venue: data.venue || null
      })
      .eq('workshop_id', id);

    if (updErr) throw updErr;

    if (data.status === 'Completed' && previousStatus !== 'Completed') {
      const { data: regs } = await supabase
        .from('registrations')
        .select('registration_id')
        .eq('workshop_id', id);

      if (regs) {
        for (const r of regs) {
          await checkAndGenerateCertificateClient(r.registration_id);
        }
      }
    }

    return { success: true, message: 'Workshop details updated successfully!' };
  },

  adminDeleteWorkshop: async (id) => {
    const { data: ws, error: wsErr } = await supabase
      .from('workshops')
      .select('*')
      .eq('workshop_id', id)
      .maybeSingle();

    if (wsErr || !ws) throw new Error('Workshop not found');

    const { data: regs } = await supabase
      .from('registrations')
      .select('registration_id')
      .eq('workshop_id', id);

    if (regs && regs.length > 0) {
      throw new Error(`Cannot delete workshop because it has ${regs.length} active student registrations.`);
    }

    const { error: delErr } = await supabase
      .from('workshops')
      .delete()
      .eq('workshop_id', id);

    if (delErr) throw delErr;
    return { success: true, message: 'Workshop deleted successfully' };
  },

  // Certificates Registry & Verification APIs
  verifyCertificate: async (codeOrId) => {
    let queryBuilder = supabase.from('certificates').select('*');
    if (isNaN(parseInt(codeOrId))) {
      queryBuilder = queryBuilder.eq('certificate_code', codeOrId);
    } else {
      queryBuilder = queryBuilder.eq('registration_id', parseInt(codeOrId));
    }

    const { data: cert, error: certErr } = await queryBuilder.maybeSingle();
    if (certErr || !cert) throw new Error('Certificate not found or invalid.');
    if (cert.status !== 'Issued') throw new Error('Certificate has not been officially issued yet.');

    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', cert.registration_id)
      .maybeSingle();

    if (regErr || !reg) throw new Error('Associated registration record not found.');

    const { data: student, error: studErr } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', reg.student_id)
      .maybeSingle();

    if (studErr || !student) throw new Error('Associated student record not found.');

    const { data: college } = await supabase.from('colleges').select('*').eq('college_id', student.college_id).maybeSingle();
    const { data: ws } = await supabase.from('workshops').select('*').eq('workshop_id', reg.workshop_id).maybeSingle();

    const getUniversityName = (cName) => {
      if (!cName) return 'Affiliated State University';
      if (cName.includes('Sathyabama')) return 'Sathyabama Institute of Science and Technology (Deemed to be University)';
      if (cName.includes('PSG') || cName.includes('Anna')) return 'Anna University, Chennai';
      if (cName.includes('Vellore') || cName.includes('VIT')) return 'Vellore Institute of Technology (Deemed to be University)';
      if (cName.includes('RV') || cName.includes('Rashtreeya')) return 'Visvesvaraya Technological University (VTU)';
      if (cName.includes('SRM')) return 'SRM Institute of Science and Technology (Deemed to be University)';
      return 'State Technical University';
    };

    return {
      success: true,
      data: {
        certificate_id: cert.certificate_id,
        certificate_code: cert.certificate_code,
        issue_date: cert.issue_date,
        attendance_percentage: cert.attendance_percentage || 100.0,
        verification_status: cert.verification_status || 'Valid',
        student_id: student.student_id,
        student_name: student.name,
        student_email: student.email,
        college_name: college?.name || 'Unknown College',
        university_name: getUniversityName(college?.name),
        department: student.branch || 'Not Specified',
        year_of_study: student.semester || 'Not Specified',
        workshop_name: ws?.title || 'Unknown Workshop',
        workshop_duration: '7 Days (35 Hours)',
        workshop_start_date: 'June 15, 2026',
        workshop_end_date: 'June 22, 2026'
      }
    };
  },

  studentGetCertificates: async () => {
    const localUser = JSON.parse(localStorage.getItem('sansah_student_user') || '{}');
    const studentId = localUser.studentId;
    if (!studentId) throw new Error('Student session profile missing.');

    const { data: regs, error: regErr } = await supabase
      .from('registrations')
      .select('registration_id, workshop_id, confirmation_status')
      .eq('student_id', studentId);

    if (regErr) throw regErr;
    if (!regs || regs.length === 0) return { success: true, data: [] };

    const regIds = regs.map(r => r.registration_id);
    const { data: certs, error: certErr } = await supabase
      .from('certificates')
      .select('*')
      .in('registration_id', regIds);

    if (certErr) throw certErr;

    const [workshopsSnapshot, studentAttendanceSnapshot] = await Promise.all([
      supabase.from('workshops').select('*'),
      supabase.from('student_attendance').select('*').eq('student_id', studentId)
    ]);

    const workshopsMap = {};
    workshopsSnapshot.data?.forEach(w => { workshopsMap[w.workshop_id] = w; });
    const attendanceRecords = studentAttendanceSnapshot.data || [];

    const certsMap = {};
    (certs || []).forEach(c => { certsMap[c.registration_id] = c; });

    const result = [];
    for (const reg of regs) {
      const workshop = workshopsMap[reg.workshop_id] || {};
      const cert = certsMap[reg.registration_id];

      const regAttRecords = attendanceRecords.filter(a => a.workshop_id === reg.workshop_id);
      const presentCount = regAttRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attendancePercentage = parseFloat(((presentCount / 7) * 100).toFixed(2));

      let eligibilityStatus = 'Not Eligible';
      let eligibilityReason = '';

      if (reg.confirmation_status !== 'Approved') {
        eligibilityReason = 'Your registration verification status must be Approved to receive a certificate.';
      } else if (workshop.status && workshop.status !== 'Completed') {
        eligibilityReason = 'The workshop status must be marked as Completed by the coordinator to receive a certificate.';
      } else if (attendancePercentage < 90) {
        eligibilityReason = 'You need at least 90% attendance to become eligible for a workshop certificate.';
      } else {
        eligibilityStatus = cert && cert.status === 'Issued' ? 'Issued' : 'Eligible';
        if (!cert || cert.status !== 'Issued') {
          eligibilityReason = 'Your certificate has not been issued yet. Please wait for the coordinator to approve and issue it.';
        }
      }

      result.push({
        registration_id: reg.registration_id,
        workshop_id: reg.workshop_id,
        workshop_title: workshop.title || 'Unknown',
        workshop_status: workshop.status || 'Active',
        confirmation_status: reg.confirmation_status,
        attendance_percentage: attendancePercentage,
        eligibility_status: eligibilityStatus,
        eligibility_reason: eligibilityReason,
        duration: '7 Days (35 Hours)',
        startDate: 'June 15, 2026',
        endDate: 'June 22, 2026',
        certificate: cert && cert.status === 'Issued' ? cert : null
      });
    }

    return { success: true, data: result };
  },

  adminGetCertificates: async (search = '', status = 'all') => {
    const [regsSnapshot, studentsSnapshot, collegesSnapshot, workshopsSnapshot, certsSnapshot, attSnapshot] = await Promise.all([
      supabase.from('registrations').select('*'),
      supabase.from('students').select('*'),
      supabase.from('colleges').select('*'),
      supabase.from('workshops').select('*'),
      supabase.from('certificates').select('*'),
      supabase.from('student_attendance').select('*')
    ]);

    const registrations = regsSnapshot.data || [];
    const studentsMap = {};
    studentsSnapshot.data?.forEach(s => { studentsMap[s.student_id] = s; });
    const collegesMap = {};
    collegesSnapshot.data?.forEach(c => { collegesMap[c.college_id] = c.name; });
    const workshopsMap = {};
    workshopsSnapshot.data?.forEach(w => { workshopsMap[w.workshop_id] = w; });
    const certsMap = {};
    certsSnapshot.data?.forEach(c => { certsMap[c.registration_id] = c; });
    const attendanceRecords = attSnapshot.data || [];

    let result = [];
    for (const reg of registrations) {
      const student = studentsMap[reg.student_id];
      if (!student) continue;

      const collegeName = collegesMap[student.college_id] || 'Unknown';
      const workshop = workshopsMap[reg.workshop_id] || {};
      const cert = certsMap[reg.registration_id];

      const regAttRecords = attendanceRecords.filter(a => a.student_id === reg.student_id && a.workshop_id === reg.workshop_id);
      const presentCount = regAttRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attendancePercentage = parseFloat(((presentCount / 7) * 100).toFixed(2));

      let certStatus = 'Not Eligible';
      if (cert && cert.status === 'Issued') {
        certStatus = 'Issued';
      } else if (reg.confirmation_status === 'Approved' && (!workshop.status || workshop.status === 'Completed') && attendancePercentage >= 90) {
        certStatus = 'Eligible for Certificate';
      }

      result.push({
        registration_id: reg.registration_id,
        student_id: student.student_id,
        student_name: student.name || '',
        student_email: student.email || '',
        college_name: collegeName,
        department: student.branch || '',
        year_of_study: student.semester || '',
        workshop_id: reg.workshop_id,
        workshop_title: workshop.title || '',
        workshop_status: workshop.status || 'Active',
        attendance_percentage: attendancePercentage,
        confirmation_status: reg.confirmation_status,
        certificate_status: certStatus,
        certificate_code: cert && cert.status === 'Issued' ? cert.certificate_code : null,
        certificate_id: cert && cert.status === 'Issued' ? cert.certificate_id : null,
        issue_date: cert && cert.status === 'Issued' ? cert.issue_date : null
      });
    }

    if (status !== 'all') {
      result = result.filter(r => r.certificate_status === status);
    }

    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        r.student_name.toLowerCase().includes(q) ||
        String(r.student_id).includes(q) ||
        r.college_name.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.workshop_title.toLowerCase().includes(q) ||
        (r.certificate_code && r.certificate_code.toLowerCase().includes(q))
      );
    }

    return { success: true, data: result };
  },

  adminRegenerateCertificate: async (regId) => {
    await checkAndGenerateCertificateClient(parseInt(regId));
    const { data: cert } = await supabase.from('certificates').select('*').eq('registration_id', parseInt(regId)).maybeSingle();
    return { success: true, data: cert };
  },

  adminIssueCertificate: async (regId) => {
    const { data: exist } = await supabase.from('certificates').select('*').eq('registration_id', parseInt(regId)).maybeSingle();
    let cert = exist;

    if (!cert) {
      await checkAndGenerateCertificateClient(parseInt(regId));
      const { data } = await supabase.from('certificates').select('*').eq('registration_id', parseInt(regId)).maybeSingle();
      cert = data;
    }

    if (!cert) {
      throw new Error('Student does not satisfy eligibility criteria.');
    }

    const { error: updErr } = await supabase
      .from('certificates')
      .update({
        status: 'Issued',
        issue_date: new Date().toISOString()
      })
      .eq('certificate_id', cert.certificate_id);

    if (updErr) throw updErr;

    await supabase.from('registration_status_history').insert({
      registration_id: parseInt(regId),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Dr. Amit Varma',
      remarks: `Certificate officially issued. Number: ${cert.certificate_code}`
    });

    await supabase.from('notifications').insert({
      student_id: cert.student_id || regId,
      message: '🎉 Congratulations! Your workshop certificate has been issued and is now available for download.',
      title: 'Certificate Issued'
    });

    return { success: true, message: 'Certificate successfully issued.' };
  },

  adminRevokeCertificate: async (regId) => {
    const { data: cert } = await supabase.from('certificates').select('*').eq('registration_id', parseInt(regId)).maybeSingle();
    if (!cert) throw new Error('No certificate found.');

    const { error: updErr } = await supabase
      .from('certificates')
      .update({
        status: 'Revoked',
        issue_date: null
      })
      .eq('certificate_id', cert.certificate_id);

    if (updErr) throw updErr;

    await supabase.from('registration_status_history').insert({
      registration_id: parseInt(regId),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Dr. Amit Varma',
      remarks: `Certificate revoked by coordinator. Number: ${cert.certificate_code}`
    });

    return { success: true, message: 'Certificate successfully revoked.' };
  },

  adminReissueCertificate: async (regId) => {
    const { data: cert } = await supabase.from('certificates').select('*').eq('registration_id', parseInt(regId)).maybeSingle();
    if (!cert) throw new Error('No certificate found.');

    const { error: updErr } = await supabase
      .from('certificates')
      .update({
        status: 'Issued',
        issue_date: new Date().toISOString()
      })
      .eq('certificate_id', cert.certificate_id);

    if (updErr) throw updErr;

    await supabase.from('registration_status_history').insert({
      registration_id: parseInt(regId),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Dr. Amit Varma',
      remarks: `Certificate reissued by coordinator. Number: ${cert.certificate_code}`
    });

    return { success: true, message: 'Certificate successfully reissued.' };
  },

  // Student Notifications
  studentGetNotifications: async () => {
    const localUser = JSON.parse(localStorage.getItem('sansah_student_user') || '{}');
    const studentId = localUser.studentId;
    if (!studentId) return { success: true, data: [] };

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  },

  studentMarkNotificationRead: async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('notification_id', id);

    if (error) throw error;
    return { success: true, message: 'Notification marked as read.' };
  }
};
