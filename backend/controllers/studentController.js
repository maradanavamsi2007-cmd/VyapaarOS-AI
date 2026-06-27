const db = require('../config/db');
const crypto = require('crypto');

// Helper to hash passwords using native crypto
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Student Signup
exports.signup = async (req, res) => {
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
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    console.log('Backend request received at studentSignup:', req.body);
    console.log('Controller executed: studentSignup');
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if email already registered
    const existRows = await db.collection('students').where('email', '==', cleanEmail).get();
    if (!existRows.empty) {
      return res.status(400).json({ success: false, message: 'Email address is already in use.' });
    }

    // Resolve College (Find or Create)
    let collegeId;
    const cleanCollegeName = collegeName.trim();
    const collegeRows = await db.collection('colleges').where('name', '==', cleanCollegeName).get();
    
    console.log('Supabase insert started');
    if (!collegeRows.empty) {
      collegeId = collegeRows.docs[0].data().college_id;
    } else {
      const { id: generatedId } = await db.collection('colleges').add({
        name: cleanCollegeName,
        city: city || 'Unknown',
        state: state || 'Unknown'
      });
      collegeId = parseInt(generatedId);
    }

    // Insert student with SHA256 hashed password
    const hashedPassword = hashPassword(password);
    // Insert student without manually assigning primary key; let Supabase generate it.
    const { id: generatedId } = await db.collection('students').add({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      college_id: collegeId,
      branch,
      semester,
      password: hashedPassword
    });
    const studentId = parseInt(generatedId);
    // Ensure the mock fallback also stores the generated ID as student_id field for consistency.


    console.log('Supabase insert success');

    res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      token: `mock-student-jwt-token-${studentId}`,
      user: {
        studentId,
        name: name.trim(),
        email: cleanEmail,
        branch,
        semester
      }
    });

  } catch (error) {
    console.error('Error signing up student:', error);
    res.status(500).json({ success: false, message: 'Failed to create student account.' });
  }
};

// Student Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const studentRows = await db.collection('students').where('email', '==', cleanEmail).get();

    if (studentRows.empty) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const student = studentRows.docs[0].data();
    const hashedPassword = hashPassword(password);

    // Support both plain text (seeded) and hashed passwords for convenience
    const isPasswordValid = student.password === password || student.password === hashedPassword;

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    res.json({
      success: true,
      token: `mock-student-jwt-token-${student.student_id}`,
      user: {
        studentId: student.student_id,
        name: student.name,
        email: student.email,
        branch: student.branch,
        semester: student.semester
      }
    });
  } catch (error) {
    console.error('Error logging in student:', error);
    res.status(500).json({ success: false, message: 'Failed to authenticate student.' });
  }
};

// Token authorization parser middleware
exports.authenticateStudent = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token.startsWith('mock-student-jwt-token-')) {
    return res.status(401).json({ success: false, message: 'Invalid session token.' });
  }

  // Extract ID from mock token
  const studentId = parseInt(token.replace('mock-student-jwt-token-', ''));
  if (isNaN(studentId)) {
    return res.status(401).json({ success: false, message: 'Invalid session profile.' });
  }

  req.studentId = studentId;
  next();
};

// Retrieve Logged-In Student Dashboard details
exports.getMyRegistrations = async (req, res) => {
  const studentId = req.studentId;

  try {
    // 1. Fetch Student profile details
    const studentDoc = await db.collection('students').doc(String(studentId)).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    const studentProfile = studentDoc.data();

    // Fetch College details to attach college_name
    const collegeDoc = await db.collection('colleges').doc(String(studentProfile.college_id)).get();
    studentProfile.college_name = collegeDoc.exists ? collegeDoc.data().name : 'Unknown';

    // 2. Fetch all registrations for this student
    const registrationsSnapshot = await db.collection('registrations').where('student_id', '==', studentId).get();
    const registrations = registrationsSnapshot.docs.map(doc => doc.data());

    // Gather extra attributes (attendance, projects, certificates, workshop details, team) for each registration
    const detailedRegistrations = [];
    for (const reg of registrations) {
      // Fetch workshop details
      const workshopDoc = await db.collection('workshops').doc(String(reg.workshop_id)).get();
      const workshop = workshopDoc.exists ? workshopDoc.data() : {};

      // Fetch team details if group registration
      let team = {};
      if (reg.team_id) {
        const teamDoc = await db.collection('teams').doc(String(reg.team_id)).get();
        team = teamDoc.exists ? teamDoc.data() : {};
      }

      // Fetch attendance
      const attendanceSnapshot = await db.collection('attendance_records')
        .where('registration_id', '==', reg.registration_id)
        .get();
      const attendance = attendanceSnapshot.docs.map(doc => doc.data())
        .sort((a, b) => a.session_date.localeCompare(b.session_date));

      // Fetch 7-Day Student Attendance
      const studentAttendanceSnapshot = await db.collection('student_attendance')
        .where('student_id', '==', studentId)
        .where('workshop_id', '==', reg.workshop_id)
        .get();
      const studentAttendance = studentAttendanceSnapshot.docs.map(doc => doc.data())
        .sort((a, b) => a.day_number - b.day_number);

      const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
      const lateCount = studentAttendance.filter(a => a.status === 'Late').length;
      const absentCount = studentAttendance.filter(a => a.status === 'Absent').length;
      const attendedCount = presentCount + lateCount;
      const attendancePercentage = parseFloat((attendedCount / 7 * 100).toFixed(2));

      // Fetch projects
      const submissionsSnapshot = await db.collection('project_submissions')
        .where('registration_id', '==', reg.registration_id)
        .get();
      const submissions = submissionsSnapshot.docs.map(doc => doc.data());

      // Fetch certificates
      const certificatesSnapshot = await db.collection('certificates')
        .where('registration_id', '==', reg.registration_id)
        .get();
      const certificates = certificatesSnapshot.docs.map(doc => doc.data());

      // Fetch group members if team registration
      let teamMembers = [];
      if (reg.team_id) {
        const teamMembersSnapshot = await db.collection('team_members')
          .where('team_id', '==', reg.team_id)
          .get();
        teamMembers = teamMembersSnapshot.docs.map(doc => doc.data());
      }

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
        submission: submissions[0] || null,
        certificate: certificates[0] && certificates[0].status === 'Issued' ? certificates[0] : null,
        team_members: teamMembers
      });
    }

    res.json({
      success: true,
      data: {
        profile: studentProfile,
        registrations: detailedRegistrations
      }
    });

  } catch (error) {
    console.error('Error fetching student dashboard details:', error);
    res.status(500).json({ success: false, message: 'Failed to compile dashboard details.' });
  }
};

// Student submits project code
exports.submitProject = async (req, res) => {
  const studentId = req.studentId;
  const { regId } = req.params;
  const { projectTitle, description, submissionLink } = req.body;

  if (!projectTitle || !submissionLink) {
    return res.status(400).json({ success: false, message: 'Project title and link are required.' });
  }

  try {
    // Verify registration ownership
    const checkRegDoc = await db.collection('registrations').doc(String(regId)).get();
    if (!checkRegDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    const registration = checkRegDoc.data();
    if (registration.student_id !== studentId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to modify this registration.' });
    }

    const existRows = await db.collection('project_submissions')
      .where('registration_id', '==', parseInt(regId))
      .get();

    if (!existRows.empty) {
      const submissionId = existRows.docs[0].data().submission_id;
      await db.collection('project_submissions').doc(String(submissionId)).update({
        project_title: projectTitle,
        description: description || '',
        submission_link: submissionLink
      });
    } else {
      const submissionId = await db.getNextId('project_submissions');
      await db.collection('project_submissions').doc(String(submissionId)).set({
        submission_id: submissionId,
        registration_id: parseInt(regId),
        project_title: projectTitle,
        description: description || '',
        submission_link: submissionLink,
        submission_date: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Project submission successfully recorded!' });
  } catch (error) {
    console.error('Error submitting student project:', error);
    res.status(500).json({ success: false, message: 'Failed to save project link.' });
  }
};

// Retrieve Student notifications
exports.getNotifications = async (req, res) => {
  const studentId = req.studentId;
  try {
    const snap = await db.collection('notifications')
      .where('student_id', '==', studentId)
      .get();
    const list = snap.docs.map(doc => doc.data());
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

// Toggle notification read status
exports.markNotificationRead = async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = db.collection('notifications').doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    await docRef.update({
      is_read: true,
      updated_at: new Date().toISOString()
    });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
};
