const db = require('../config/db');
const crypto = require('crypto');
const { checkAndGenerateCertificate, checkAllWorkshopRegistrations } = require('../utils/certificateHelper');

// Helper to hash password to SHA256
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Admin Authentication (Dynamic coordinator credentials)
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = hashPassword(password);
    
    let coordinatorDoc = null;
    if (username === 'admin') {
      const doc = await db.collection('coordinators').doc('1').get();
      if (doc.exists) {
        coordinatorDoc = doc;
      }
    }
    
    if (!coordinatorDoc) {
      const snapshot = await db.collection('coordinators').where('email', '==', username).get();
      if (!snapshot.empty) {
        coordinatorDoc = snapshot.docs[0];
      }
    }
    
    if (!coordinatorDoc) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    
    const coordData = coordinatorDoc.data();
    
    if (coordData.password !== hashed) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    
    // Update last login and login history
    const loginTime = new Date().toISOString();
    const history = coordData.login_history || [];
    history.unshift(loginTime);
    if (history.length > 20) {
      history.pop();
    }
    
    await db.collection('coordinators').doc(String(coordData.coordinator_id || coordinatorDoc.id)).update({
      last_login: loginTime,
      login_history: history
    });
    
    res.json({
      success: true,
      token: 'mock-jwt-token-for-sansah-innovations-admin',
      user: {
        coordinator_id: coordData.coordinator_id || coordinatorDoc.id,
        name: coordData.name,
        email: coordData.email,
        role: coordData.role || 'Coordinator',
        username: coordData.email
      }
    });
  } catch (error) {
    console.error('Error logging in coordinator:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

// Get Dashboard Analytics
exports.getDashboardStats = async (req, res) => {
  try {
    // Total, Approved, Pending Registrations
    const regsSnapshot = await db.collection('registrations').get();
    const registrations = regsSnapshot.docs.map(doc => doc.data());

    let totalCount = registrations.length;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    registrations.forEach(r => {
      if (r.confirmation_status === 'Approved') approvedCount++;
      else if (r.confirmation_status === 'Pending') pendingCount++;
      else if (r.confirmation_status === 'Rejected') rejectedCount++;
    });

    // Workshop-wise Statistics
    const workshopsSnapshot = await db.collection('workshops').get();
    const workshops = workshopsSnapshot.docs.map(doc => doc.data());

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

    // College-wise Statistics
    const studentsSnapshot = await db.collection('students').get();
    const students = studentsSnapshot.docs.map(doc => doc.data());

    const collegesSnapshot = await db.collection('colleges').get();
    const colleges = collegesSnapshot.docs.map(doc => doc.data());

    const studentToCollegeMap = {};
    students.forEach(s => {
      studentToCollegeMap[s.student_id] = s.college_id;
    });

    const collegeNameMap = {};
    colleges.forEach(c => {
      collegeNameMap[c.college_id] = c.name;
    });

    const collegeCounts = {};
    registrations.forEach(r => {
      const colId = studentToCollegeMap[r.student_id];
      if (colId) {
        const colName = collegeNameMap[colId];
        if (colName) {
          collegeCounts[colName] = (collegeCounts[colName] || 0) + 1;
        }
      }
    });

    const collegeStats = Object.keys(collegeCounts).map(name => ({
      name,
      count: collegeCounts[name]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    res.json({
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
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

// Get All Registrations with pagination, search, and filtering
exports.getAllRegistrations = async (req, res) => {
  const { search = '', workshop = '', college = '', paymentStatus = '', confirmationStatus = '' } = req.query;

  try {
    const regsSnapshot = await db.collection('registrations').get();
    let result = [];

    // Parallel fetch related details
    const studentsSnapshot = await db.collection('students').get();
    const collegesSnapshot = await db.collection('colleges').get();
    const workshopsSnapshot = await db.collection('workshops').get();

    const students = studentsSnapshot.docs.map(doc => doc.data());
    const colleges = collegesSnapshot.docs.map(doc => doc.data());
    const workshops = workshopsSnapshot.docs.map(doc => doc.data());

    const studentMap = {}; students.forEach(s => { studentMap[s.student_id] = s; });
    const collegeMap = {}; colleges.forEach(c => { collegeMap[c.college_id] = c; });
    const workshopMap = {}; workshops.forEach(w => { workshopMap[w.workshop_id] = w; });

    regsSnapshot.docs.forEach(doc => {
      const reg = doc.data();
      const student = studentMap[reg.student_id] || {};
      const collegeDetails = collegeMap[student.college_id] || {};
      const workshopDetails = workshopMap[reg.workshop_id] || {};

      result.push({
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
      });
    });

    // Apply filtering in JavaScript memory
    if (search) {
      const sLower = search.toLowerCase();
      result = result.filter(r => 
        r.student_name.toLowerCase().includes(sLower) || 
        r.student_email.toLowerCase().includes(sLower) || 
        r.college_name.toLowerCase().includes(sLower)
      );
    }

    if (workshop) {
      result = result.filter(r => String(r.workshop_id) === String(workshop));
    }

    if (college) {
      const cLower = college.toLowerCase();
      result = result.filter(r => r.college_name.toLowerCase().includes(cLower));
    }

    if (paymentStatus) {
      result = result.filter(r => r.payment_status === paymentStatus);
    }

    if (confirmationStatus) {
      result = result.filter(r => r.confirmation_status === confirmationStatus);
    }

    // Sort by registration date descending
    result.sort((a, b) => b.registration_date.localeCompare(a.registration_date));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
};

// Helper to send registration approval email notification
async function sendApprovalEmailHelper(registrationId, registration) {
  try {
    const studentDoc = await db.collection('students').doc(String(registration.student_id)).get();
    if (!studentDoc.exists) {
      console.error(`[Email notification] Student not found for ID ${registration.student_id}`);
      return;
    }
    const student = studentDoc.data();

    const workshopDoc = await db.collection('workshops').doc(String(registration.workshop_id)).get();
    if (!workshopDoc.exists) {
      console.error(`[Email notification] Workshop not found for ID ${registration.workshop_id}`);
      return;
    }
    const workshop = workshopDoc.data();

    let teamName = '';
    let isGroup = false;
    if (registration.team_id) {
      const teamDoc = await db.collection('teams').doc(String(registration.team_id)).get();
      if (teamDoc.exists) {
        teamName = teamDoc.data().team_name;
        isGroup = true;
      }
    }

    const mailer = require('../utils/mailer');
    await mailer.sendRegistrationEmail(student.email, {
      studentName: student.name,
      workshopTitle: workshop.title,
      trainerName: workshop.trainer_name,
      venue: workshop.venue,
      schedule: workshop.schedule,
      fee: workshop.fee,
      isGroup: isGroup,
      teamName: teamName
    });
  } catch (err) {
    console.error('[Email notification error] Failed to fetch data and send email:', err);
  }
}

// Update confirmation status (Approve / Reject)
exports.updateRegistrationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks = '', changedBy = 'Admin' } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid confirmation status' });
  }

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const registration = regDoc.data();
    const prevStatus = registration.confirmation_status;

    if (prevStatus === status) {
      return res.json({ success: true, message: `Registration is already ${status}` });
    }

    // Update registration status
    await db.collection('registrations').doc(String(id)).update({ confirmation_status: status });

    // Insert history
    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(id),
      previous_status: prevStatus,
      new_status: status,
      changed_by: changedBy,
      remarks: remarks || `Status changed from ${prevStatus} to ${status}`,
      changed_at: new Date().toISOString()
    });

    // Send confirmation email if approved
    if (status === 'Approved') {
      sendApprovalEmailHelper(id, registration);
    }

    // Trigger certificate check
    await checkAndGenerateCertificate(id);

    res.json({ success: true, message: `Registration status updated to ${status} successfully` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Failed to update registration status' });
  }
};

// Update payment status (Pending, Completed, Refunded)
exports.updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks = '', changedBy = 'Admin' } = req.body;

  if (!['Pending', 'Completed', 'Refunded'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid payment status' });
  }

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const registration = regDoc.data();
    const prevStatus = registration.payment_status;

    if (prevStatus === status) {
      return res.json({ success: true, message: `Payment is already marked as ${status}` });
    }

    // Update payment status
    await db.collection('registrations').doc(String(id)).update({ payment_status: status });

    // Insert history
    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(id),
      previous_status: prevStatus,
      new_status: status,
      changed_by: changedBy,
      remarks: remarks || `Payment status updated from ${prevStatus} to ${status}`,
      changed_at: new Date().toISOString()
    });

    // Auto-approve if payment is completed and current status is Pending
    if (status === 'Completed' && registration.confirmation_status === 'Pending') {
      await db.collection('registrations').doc(String(id)).update({ confirmation_status: 'Approved' });
      
      const approveHistoryId = await db.getNextId('registration_status_history');
      await db.collection('registration_status_history').doc(String(approveHistoryId)).set({
        history_id: approveHistoryId,
        registration_id: parseInt(id),
        previous_status: 'Pending',
        new_status: 'Approved',
        changed_by: 'System',
        remarks: 'Registration auto-approved on payment verification.',
        changed_at: new Date().toISOString()
      });

      // Send confirmation email if approved
      sendApprovalEmailHelper(id, registration);

      // Trigger certificate check on auto-approval
      const { checkAndGenerateCertificate } = require('../utils/certificateHelper');
      await checkAndGenerateCertificate(id);
    }


    res.json({ success: true, message: `Payment status updated to ${status} successfully` });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment status' });
  }
};

// Record Attendance
exports.recordAttendance = async (req, res) => {
  const { id } = req.params;
  const { date, status } = req.body; // status: 'Present', 'Absent'

  if (!date || !status || !['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Date and valid status (Present/Absent) are required.' });
  }

  try {
    const checkRegDoc = await db.collection('registrations').doc(String(id)).get();
    if (!checkRegDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const existRows = await db.collection('attendance_records')
      .where('registration_id', '==', parseInt(id))
      .where('session_date', '==', date)
      .get();
    
    if (!existRows.empty) {
      const attendanceId = existRows.docs[0].data().attendance_id;
      await db.collection('attendance_records').doc(String(attendanceId)).update({ status });
    } else {
      const attendanceId = await db.getNextId('attendance_records');
      await db.collection('attendance_records').doc(String(attendanceId)).set({
        attendance_id: attendanceId,
        registration_id: parseInt(id),
        session_date: date,
        status: status
      });
    }

    res.json({ success: true, message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
};

// Submit Project / Assessment
exports.submitProject = async (req, res) => {
  const { id } = req.params;
  const { projectTitle, description, submissionLink, score = null, remarks = '' } = req.body;

  if (!projectTitle || !submissionLink) {
    return res.status(400).json({ success: false, message: 'Project title and submission link are required.' });
  }

  try {
    const checkRegDoc = await db.collection('registrations').doc(String(id)).get();
    if (!checkRegDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const existRows = await db.collection('project_submissions')
      .where('registration_id', '==', parseInt(id))
      .get();
    
    if (!existRows.empty) {
      const submissionId = existRows.docs[0].data().submission_id;
      await db.collection('project_submissions').doc(String(submissionId)).update({
        project_title: projectTitle,
        description: description || '',
        submission_link: submissionLink,
        score: score !== null ? parseInt(score) : null,
        remarks: remarks || ''
      });
    } else {
      const submissionId = await db.getNextId('project_submissions');
      await db.collection('project_submissions').doc(String(submissionId)).set({
        submission_id: submissionId,
        registration_id: parseInt(id),
        project_title: projectTitle,
        description: description || '',
        submission_link: submissionLink,
        score: score !== null ? parseInt(score) : null,
        remarks: remarks || '',
        submission_date: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Project submission saved successfully' });
  } catch (error) {
    console.error('Error submitting project:', error);
    res.status(500).json({ success: false, message: 'Failed to save project submission' });
  }
};

// Issue Certificate
exports.issueCertificate = async (req, res) => {
  const { id } = req.params;

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const reg = regDoc.data();

    if (reg.confirmation_status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Certificates can only be issued for approved registrations.' });
    }

    // Check attendance eligibility (Min 90% attendance required - 7 out of 7 days)
    const attSnapshot = await db.collection('student_attendance')
      .where('student_id', '==', reg.student_id)
      .where('workshop_id', '==', reg.workshop_id)
      .get();
    const attendanceRecords = attSnapshot.docs.map(doc => doc.data());
    
    const presentCount = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const attendancePercentage = (presentCount / 7) * 100;

    if (attendancePercentage < 90) {
      return res.status(400).json({
        success: false,
        message: `Ineligible for certificate: Student attendance is only ${Math.round(attendancePercentage)}% (Present for ${presentCount}/7 days). Min 90% (7 days) is required.`
      });
    }

    // Check workshop completed status
    const workshopDoc = await db.collection('workshops').doc(String(reg.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};
    if (workshop.status && workshop.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Ineligible for certificate: Workshop status must be Completed.'
      });
    }

    // Check if certificate already exists
    const existCert = await db.collection('certificates')
      .where('registration_id', '==', parseInt(id))
      .get();
    if (!existCert.empty) {
      return res.json({ success: true, message: 'Certificate already issued', data: existCert.docs[0].data() });
    }

    // Generate unique code
    const randomHex = Math.floor(100000 + Math.random() * 900000); // 6 digit number
    const certCode = `SANSAH-WS-${randomHex}`;
    const downloadUrl = `/api/certificates/download/${certCode}`; // Placeholder PDF path

    const certificateId = await db.getNextId('certificates');
    await db.collection('certificates').doc(String(certificateId)).set({
      certificate_id: certificateId,
      registration_id: parseInt(id),
      certificate_code: certCode,
      download_url: downloadUrl,
      issue_date: new Date().toISOString()
    });

    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(id),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Admin',
      remarks: `Certificate issued. Code: ${certCode}`,
      changed_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Certificate issued successfully',
      data: { certificate_code: certCode, download_url: downloadUrl }
    });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to issue certificate' });
  }
};

// Add new workshop
exports.addWorkshop = async (req, res) => {
  const { title, description, capacity = 50, trainerName, fee = 0.00, image_url, deadline, schedule, venue } = req.body;

  if (!title || !trainerName) {
    return res.status(400).json({ success: false, message: 'Workshop title and trainer name are required.' });
  }

  try {
    // Check unique title
    const exist = await db.collection('workshops')
      .where('title', '==', title.trim())
      .get();
    if (!exist.empty) {
      return res.status(400).json({ success: false, message: 'A workshop with this title already exists.' });
    }

    const workshopId = await db.getNextId('workshops');
    await db.collection('workshops').doc(String(workshopId)).set({
      workshop_id: workshopId,
      title: title.trim(),
      description: description || '',
      capacity: parseInt(capacity),
      status: 'Active',
      fee: parseFloat(fee),
      trainer_name: trainerName.trim(),
      image_url: image_url || null,
      deadline: deadline || null,
      schedule: schedule || null,
      venue: venue || null
    });

    res.status(201).json({
      success: true,
      message: 'Workshop added successfully!',
      data: { workshop_id: workshopId }
    });
  } catch (error) {
    console.error('Error adding workshop:', error);
    res.status(500).json({ success: false, message: 'Failed to add workshop' });
  }
};

// Edit existing workshop
exports.editWorkshop = async (req, res) => {
  const { id } = req.params;
  const { title, description, capacity, status, fee, trainerName, image_url, deadline, schedule, venue } = req.body;

  if (!title || !trainerName) {
    return res.status(400).json({ success: false, message: 'Workshop title and trainer name are required.' });
  }

  try {
    const existWorkshopDoc = await db.collection('workshops').doc(String(id)).get();
    if (!existWorkshopDoc.exists) {
      return res.status(404).json({ success: false, message: 'Workshop not found' });
    }

    // Check unique title for other workshops
    const titleExist = await db.collection('workshops')
      .where('title', '==', title.trim())
      .get();
    
    // Filter in JS to see if another document with this title exists but has a different ID
    const hasConflict = titleExist.docs.some(doc => String(doc.data().workshop_id) !== String(id));
    if (hasConflict) {
      return res.status(400).json({ success: false, message: 'A workshop with this title already exists.' });
    }

    const previousStatus = existWorkshopDoc.data().status;

    await db.collection('workshops').doc(String(id)).update({
      title: title.trim(),
      description: description || '',
      capacity: parseInt(capacity),
      status: status || 'Active',
      fee: parseFloat(fee),
      trainer_name: trainerName.trim(),
      image_url: image_url || null,
      deadline: deadline || null,
      schedule: schedule || null,
      venue: venue || null
    });

    // If status is changed to Completed, run certificate generator for all registrants of this workshop
    if (status === 'Completed' && previousStatus !== 'Completed') {
      await checkAllWorkshopRegistrations(id);
    }

    res.json({ success: true, message: 'Workshop details updated successfully!' });
  } catch (error) {
    console.error('Error editing workshop:', error);
    res.status(500).json({ success: false, message: 'Failed to update workshop' });
  }
};

// Delete workshop
exports.deleteWorkshop = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check if exists
    const checkDoc = await db.collection('workshops').doc(String(id)).get();
    if (!checkDoc.exists) {
      return res.status(404).json({ success: false, message: 'Workshop not found' });
    }
    const workshop = checkDoc.data();

    // 2. Prevent deletion if there are registrations
    const regCountRows = await db.collection('registrations')
      .where('workshop_id', '==', parseInt(id))
      .get();
    const regCount = regCountRows.size;
    
    if (regCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete workshop '${workshop.title}' because it has ${regCount} active student registrations. Please reallocate or reject students first.`
      });
    }

    // 3. Delete
    await db.collection('workshops').doc(String(id)).delete();
    res.json({ success: true, message: 'Workshop deleted successfully' });
  } catch (error) {
    console.error('Error deleting workshop:', error);
    res.status(500).json({ success: false, message: 'Failed to delete workshop' });
  }
};

// Get Coordinator Profile
exports.getProfile = async (req, res) => {
  try {
    const doc = await db.collection('coordinators').doc('1').get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Coordinator profile not found' });
    }
    const data = doc.data();
    const { password, ...safeData } = data;
    
    res.json({
      success: true,
      data: safeData
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coordinator profile' });
  }
};

// Update Coordinator Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, department, notification_settings } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required' });
    }

    const docRef = db.collection('coordinators').doc('1');
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Coordinator profile not found' });
    }

    const updateData = {
      name,
      email,
      phone: phone || '',
      department: department || '',
      updated_at: new Date().toISOString()
    };

    if (notification_settings) {
      updateData.notification_settings = {
        email: !!notification_settings.email,
        sms: !!notification_settings.sms,
        reminders: !!notification_settings.reminders,
        alerts: !!notification_settings.alerts
      };
    }

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    const { password, ...safeData } = updatedData;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: safeData
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ success: false, message: 'Failed to update coordinator profile' });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const docRef = db.collection('coordinators').doc('1');
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Coordinator profile not found' });
    }

    const coordData = doc.data();
    const hashedCurrent = hashPassword(currentPassword);
    
    if (coordData.password !== hashedCurrent) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const hashedNew = hashPassword(newPassword);
    await docRef.update({
      password: hashedNew,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// Get Recent Activities
exports.getRecentActivities = async (req, res) => {
  try {
    const historySnapshot = await db.collection('registration_status_history').get();
    let history = historySnapshot.docs.map(doc => doc.data());
    
    // Sort by changed_at descending (latest first)
    history.sort((a, b) => new Date(b.changed_at || 0) - new Date(a.changed_at || 0));
    
    const latestHistory = history.slice(0, 5);
    
    const regsSnapshot = await db.collection('registrations').get();
    const studentsSnapshot = await db.collection('students').get();
    const workshopsSnapshot = await db.collection('workshops').get();
    
    const regs = regsSnapshot.docs.map(doc => doc.data());
    const students = studentsSnapshot.docs.map(doc => doc.data());
    const workshops = workshopsSnapshot.docs.map(doc => doc.data());
    
    const studentMap = {}; students.forEach(s => studentMap[s.student_id] = s.name);
    const workshopMap = {}; workshops.forEach(w => workshopMap[w.workshop_id] = w.title);
    const regMap = {}; regs.forEach(r => {
      regMap[r.registration_id] = {
        studentName: studentMap[r.student_id] || 'Unknown Student',
        workshopTitle: workshopMap[r.workshop_id] || 'Unknown Workshop'
      };
    });
    
    const resolved = latestHistory.map(h => {
      const reg = regMap[h.registration_id] || { studentName: 'System', workshopTitle: '' };
      return {
        ...h,
        studentName: reg.studentName,
        workshopTitle: reg.workshopTitle
      };
    });
    
    res.json({
      success: true,
      data: resolved
    });
  } catch (error) {
    console.error('Error in getRecentActivities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activities' });
  }
};
