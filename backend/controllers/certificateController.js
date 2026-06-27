const db = require('../config/db');
const { checkAndGenerateCertificate } = require('../utils/certificateHelper');
const { generateCertificatePDFFile } = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

// Helper to resolve university names dynamically for premium lookup
function getUniversityName(collegeName) {
  if (!collegeName) return 'Affiliated State University';
  if (collegeName.includes('Sathyabama')) return 'Sathyabama Institute of Science and Technology (Deemed to be University)';
  if (collegeName.includes('PSG') || collegeName.includes('Anna')) return 'Anna University, Chennai';
  if (collegeName.includes('Vellore') || collegeName.includes('VIT')) return 'Vellore Institute of Technology (Deemed to be University)';
  if (collegeName.includes('RV') || collegeName.includes('Rashtreeya')) return 'Visvesvaraya Technological University (VTU)';
  if (collegeName.includes('SRM')) return 'SRM Institute of Science and Technology (Deemed to be University)';
  return 'State Technical University';
}

// Helper to determine workshop duration / dates dynamically based on workshop ID
function getWorkshopMetadata(workshopId) {
  const id = parseInt(workshopId);
  switch (id) {
    case 1:
      return { duration: '7 Days (35 Hours)', startDate: 'June 10, 2026', endDate: 'June 17, 2026' };
    case 2:
      return { duration: '7 Days (35 Hours)', startDate: 'June 12, 2026', endDate: 'June 19, 2026' };
    case 3:
      return { duration: '7 Days (30 Hours)', startDate: 'June 15, 2026', endDate: 'June 22, 2026' };
    case 4:
      return { duration: '7 Days (35 Hours)', startDate: 'June 18, 2026', endDate: 'June 25, 2026' };
    case 5:
      return { duration: '7 Days (30 Hours)', startDate: 'June 20, 2026', endDate: 'June 27, 2026' };
    default:
      return { duration: '7 Days (30 Hours)', startDate: 'June 15, 2026', endDate: 'June 22, 2026' };
  }
}

// 1. Public Certificate Verification
exports.verifyCertificate = async (req, res) => {
  const { codeOrId } = req.params;

  try {
    let certDoc = null;
    
    // Check if it is a numeric ID or string code
    if (/^\d+$/.test(codeOrId)) {
      certDoc = await db.collection('certificates').doc(String(codeOrId)).get();
    }
    
    if (!certDoc || !certDoc.exists) {
      // Lookup by code
      const codeMatches = await db.collection('certificates')
        .where('certificate_code', '==', codeOrId)
        .get();
      if (!codeMatches.empty) {
        certDoc = codeMatches.docs[0];
      }
    }

    if (!certDoc || !certDoc.exists) {
      return res.status(404).json({ success: false, message: 'Certificate not found or invalid' });
    }

    const cert = certDoc.data();
    if (cert.status !== 'Issued') {
      return res.status(404).json({ success: false, message: 'Certificate has not been officially issued yet' });
    }
    
    // Fetch related registration, student, college, and workshop info
    const regDoc = await db.collection('registrations').doc(String(cert.registration_id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Associated registration record not found' });
    }
    const reg = regDoc.data();

    const studentDoc = await db.collection('students').doc(String(reg.student_id)).get();
    const student = studentDoc.exists ? studentDoc.data() : {};

    const collegeDoc = await db.collection('colleges').doc(String(student.college_id)).get();
    const collegeName = collegeDoc.exists ? collegeDoc.data().name : 'Unknown College';

    const workshopDoc = await db.collection('workshops').doc(String(reg.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};

    const datesInfo = getWorkshopMetadata(reg.workshop_id);

    res.json({
      success: true,
      data: {
        certificate_id: cert.certificate_id,
        certificate_code: cert.certificate_code,
        issue_date: cert.issue_date,
        attendance_percentage: cert.attendance_percentage,
        verification_status: cert.verification_status || 'Valid',
        
        student_id: student.student_id,
        student_name: student.name || 'Unknown',
        student_email: student.email || '',
        college_name: collegeName,
        university_name: getUniversityName(collegeName),
        department: student.branch || 'Not Specified',
        year_of_study: student.semester || 'Not Specified',
        
        workshop_name: workshop.title || 'Unknown Workshop',
        workshop_duration: datesInfo.duration,
        workshop_start_date: datesInfo.startDate,
        workshop_end_date: datesInfo.endDate
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to verify certificate details.' });
  }
};

// 2. Retrieve My Certificates (Student view)
exports.getMyCertificates = async (req, res) => {
  const studentId = req.studentId;

  try {
    // Fetch all registrations for this student
    const regsSnapshot = await db.collection('registrations')
      .where('student_id', '==', studentId)
      .get();
    const registrations = regsSnapshot.docs.map(doc => doc.data());

    // Fetch related workshops and student attendance
    const workshopsSnapshot = await db.collection('workshops').get();
    const workshopsMap = {};
    workshopsSnapshot.docs.forEach(doc => {
      const w = doc.data();
      workshopsMap[w.workshop_id] = w;
    });

    const studentAttendanceSnapshot = await db.collection('student_attendance')
      .where('student_id', '==', studentId)
      .get();
    const attendanceRecords = studentAttendanceSnapshot.docs.map(doc => doc.data());

    // Fetch certificates
    const certsSnapshot = await db.collection('certificates')
      .where('student_id', '==', studentId)
      .get();
    const certsMap = {};
    certsSnapshot.docs.forEach(doc => {
      const c = doc.data();
      certsMap[c.registration_id] = c;
    });

    const result = [];
    for (const reg of registrations) {
      const workshop = workshopsMap[reg.workshop_id] || {};
      const cert = certsMap[reg.registration_id];

      // Calculate attendance percentage
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

      const datesInfo = getWorkshopMetadata(reg.workshop_id);

      result.push({
        registration_id: reg.registration_id,
        workshop_id: reg.workshop_id,
        workshop_title: workshop.title || 'Unknown',
        workshop_status: workshop.status || 'Active',
        confirmation_status: reg.confirmation_status,
        attendance_percentage: attendancePercentage,
        eligibility_status: eligibilityStatus,
        eligibility_reason: eligibilityReason,
        duration: datesInfo.duration,
        startDate: datesInfo.startDate,
        endDate: datesInfo.endDate,
        certificate: cert && cert.status === 'Issued' ? cert : null
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve certificates.' });
  }
};

// 3. Admin Certificates Registry List
exports.getCertificatesList = async (req, res) => {
  const { search = '', status = 'all' } = req.query;

  try {
    const [regsSnapshot, studentsSnapshot, collegesSnapshot, workshopsSnapshot, certsSnapshot, attSnapshot] = await Promise.all([
      db.collection('registrations').get(),
      db.collection('students').get(),
      db.collection('colleges').get(),
      db.collection('workshops').get(),
      db.collection('certificates').get(),
      db.collection('student_attendance').get()
    ]);

    const registrations = regsSnapshot.docs.map(doc => doc.data());
    const studentsMap = {};
    studentsSnapshot.docs.forEach(doc => {
      const s = doc.data();
      studentsMap[s.student_id] = s;
    });

    const collegesMap = {};
    collegesSnapshot.docs.forEach(doc => {
      const c = doc.data();
      collegesMap[c.college_id] = c.name;
    });

    const workshopsMap = {};
    workshopsSnapshot.docs.forEach(doc => {
      const w = doc.data();
      workshopsMap[w.workshop_id] = w;
    });

    const certsMap = {};
    certsSnapshot.docs.forEach(doc => {
      const c = doc.data();
      certsMap[c.registration_id] = c;
    });

    const attendanceRecords = attSnapshot.docs.map(doc => doc.data());

    let result = [];
    for (const reg of registrations) {
      const student = studentsMap[reg.student_id];
      if (!student) continue;

      const collegeName = collegesMap[student.college_id] || 'Unknown';
      const workshop = workshopsMap[reg.workshop_id] || {};
      const cert = certsMap[reg.registration_id];

      // Calculate attendance percentage
      const regAttRecords = attendanceRecords.filter(a => a.student_id === reg.student_id && a.workshop_id === reg.workshop_id);
      const presentCount = regAttRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attendancePercentage = parseFloat(((presentCount / 7) * 100).toFixed(2));

      // Determine Eligibility status
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

    // Apply filters
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

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching admin certificates list:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates.' });
  }
};

// 4. Force Regenerate Certificate (Admin trigger)
exports.regenerateCertificate = async (req, res) => {
  const { regId } = req.params;

  try {
    const cert = await checkAndGenerateCertificate(parseInt(regId));
    if (cert) {
      res.json({ success: true, message: 'Certificate successfully generated/verified.', data: cert });
    } else {
      res.json({ success: true, message: 'Registration evaluated: Student does not meet the eligibility requirements. Any existing certificate has been revoked.', data: null });
    }
  } catch (error) {
    console.error('Error regenerating certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to process certificate evaluation.' });
  }
};

// 5. Issue Certificate
exports.issueCertificate = async (req, res) => {
  const { regId } = req.params;
  try {
    let cert = null;
    const certSnapshot = await db.collection('certificates')
      .where('registration_id', '==', parseInt(regId))
      .get();
    
    if (certSnapshot.empty) {
      cert = await checkAndGenerateCertificate(parseInt(regId));
    } else {
      cert = certSnapshot.docs[0].data();
    }

    if (!cert) {
      return res.status(400).json({ success: false, message: 'Student does not satisfy the certificate eligibility criteria.' });
    }

    if (cert.status === 'Issued') {
      return res.status(400).json({ success: false, message: 'Certificate is already issued.' });
    }

    const updatedData = {
      status: 'Issued',
      issued_by: 'Dr. Amit Varma',
      issue_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.collection('certificates').doc(String(cert.certificate_id)).update(updatedData);

    // Generate the certificate PDF file on disk
    await generateCertificatePDFFile({
      ...cert,
      ...updatedData
    });

    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(regId),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Dr. Amit Varma',
      remarks: `Certificate officially issued. Number: ${cert.certificate_code}`,
      changed_at: new Date().toISOString()
    });

    const notificationId = await db.getNextId('notifications');
    await db.collection('notifications').doc(String(notificationId)).set({
      notification_id: notificationId,
      student_id: cert.student_id,
      message: '🎉 Congratulations! Your workshop certificate has been issued and is now available for download.',
      type: 'certificate',
      is_read: false,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Certificate successfully issued.',
      data: {
        ...cert,
        ...updatedData
      }
    });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to issue certificate.' });
  }
};

// 6. Revoke Certificate
exports.revokeCertificate = async (req, res) => {
  const { regId } = req.params;
  try {
    const certSnapshot = await db.collection('certificates')
      .where('registration_id', '==', parseInt(regId))
      .get();

    if (certSnapshot.empty) {
      return res.status(404).json({ success: false, message: 'No certificate found for this registration.' });
    }

    const cert = certSnapshot.docs[0].data();

    await db.collection('certificates').doc(String(cert.certificate_id)).update({
      status: 'Revoked',
      issued_by: null,
      issue_date: null,
      updated_at: new Date().toISOString()
    });

    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(regId),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Dr. Amit Varma',
      remarks: `Certificate revoked by coordinator. Number: ${cert.certificate_code}`,
      changed_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Certificate successfully revoked.'
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke certificate.' });
  }
};

// 7. Reissue Certificate
exports.reissueCertificate = async (req, res) => {
  const { regId } = req.params;
  try {
    const certSnapshot = await db.collection('certificates')
      .where('registration_id', '==', parseInt(regId))
      .get();

    if (certSnapshot.empty) {
      return res.status(404).json({ success: false, message: 'No certificate found for this registration.' });
    }

    const cert = certSnapshot.docs[0].data();

    const updatedData = {
      status: 'Issued',
      issued_by: 'Dr. Amit Varma',
      issue_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.collection('certificates').doc(String(cert.certificate_id)).update(updatedData);

    // Regenerate the certificate PDF file on disk
    await generateCertificatePDFFile({
      ...cert,
      ...updatedData
    });

    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(regId),
      previous_status: 'Approved',
      new_status: 'Approved',
      changed_by: 'Dr. Amit Varma',
      remarks: `Certificate reissued by coordinator. Number: ${cert.certificate_code}`,
      changed_at: new Date().toISOString()
    });

    const notificationId = await db.getNextId('notifications');
    await db.collection('notifications').doc(String(notificationId)).set({
      notification_id: notificationId,
      student_id: cert.student_id,
      message: '🎉 Congratulations! Your workshop certificate has been issued and is now available for download.',
      type: 'certificate',
      is_read: false,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Certificate successfully reissued.',
      data: {
        ...cert,
        ...updatedData
      }
    });
  } catch (error) {
    console.error('Error reissuing certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to reissue certificate.' });
  }
};

// 8. Download Certificate PDF File
exports.downloadCertificate = async (req, res) => {
  const { code } = req.params;
  try {
    const certSnapshot = await db.collection('certificates')
      .where('certificate_code', '==', code)
      .get();

    if (certSnapshot.empty) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const cert = certSnapshot.docs[0].data();
    if (cert.status !== 'Issued') {
      return res.status(400).json({ success: false, message: 'Certificate has not been issued yet.' });
    }

    const filePath = path.join(__dirname, '../storage/certificates', `${code}.pdf`);
    
    // Check if file exists, if not, generate it dynamically
    if (!fs.existsSync(filePath)) {
      await generateCertificatePDFFile(cert);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate-${code}.pdf`);

    res.download(filePath, `Certificate-${code}.pdf`, (err) => {
      if (err) {
        console.error('Error downloading certificate PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Failed to download certificate.' });
        }
      }
    });
  } catch (error) {
    console.error('Error in downloadCertificate:', error);
    res.status(500).json({ success: false, message: 'An error occurred during certificate download.' });
  }
};
