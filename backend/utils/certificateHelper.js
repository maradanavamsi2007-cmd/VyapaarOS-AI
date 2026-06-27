const db = require('../config/db');

/**
 * Checks if a student is eligible for a certificate, then generates or revokes it.
 * Eligibility rules:
 * 1. Attendance Percentage >= 90%
 * 2. Student Verification Status === 'Approved'
 * 3. Workshop Status === 'Completed' (if status is configured)
 */
async function checkAndGenerateCertificate(registrationId) {
  try {
    const regDoc = await db.collection('registrations').doc(String(registrationId)).get();
    if (!regDoc.exists) return null;
    const reg = regDoc.data();

    // Condition 1: Verification status must be 'Approved'
    if (reg.confirmation_status !== 'Approved') {
      await removeCertificateIfExists(registrationId);
      return null;
    }

    // Fetch workshop details
    const workshopDoc = await db.collection('workshops').doc(String(reg.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};

    // Condition 2: Workshop Status must be 'Completed'
    if (workshop.status && workshop.status !== 'Completed') {
      await removeCertificateIfExists(registrationId);
      return null;
    }

    // Condition 3: Attendance percentage >= 90%
    const attSnapshot = await db.collection('student_attendance')
      .where('student_id', '==', reg.student_id)
      .where('workshop_id', '==', reg.workshop_id)
      .get();
    const attendanceRecords = attSnapshot.docs.map(doc => doc.data());
    
    // Calculate attendance percentage (Present and Late count as attended)
    const presentCount = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const attendancePercentage = (presentCount / 7) * 100;

    if (attendancePercentage < 90) {
      await removeCertificateIfExists(registrationId);
      return null;
    }

    const formattedPercentage = parseFloat(attendancePercentage.toFixed(2));

    // Verify if certificate already exists
    const existCert = await db.collection('certificates')
      .where('registration_id', '==', parseInt(registrationId))
      .get();

    if (!existCert.empty) {
      const cert = existCert.docs[0].data();
      // If attendance percentage changed, update it
      if (parseFloat(cert.attendance_percentage) !== formattedPercentage) {
        await db.collection('certificates').doc(String(cert.certificate_id)).update({
          attendance_percentage: formattedPercentage,
          updated_at: new Date().toISOString()
        });
      }
      return { ...cert, attendance_percentage: formattedPercentage };
    }

    // Generate new unique certificate details
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    const certCode = `SANSAH-WS-${randomHex}`;
    const certificateId = await db.getNextId('certificates');
    const downloadUrl = `/api/certificates/download/${certCode}`;

    const certData = {
      certificate_id: certificateId,
      registration_id: parseInt(registrationId),
      student_id: reg.student_id,
      workshop_id: reg.workshop_id,
      attendance_percentage: formattedPercentage,
      certificate_code: certCode,
      issue_date: null,
      download_url: downloadUrl,
      verification_status: 'Valid',
      qr_code_data: certCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Eligible',
      issued_by: null
    };

    await db.collection('certificates').doc(String(certificateId)).set(certData);

    // Save history entry
    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: parseInt(registrationId),
      previous_status: reg.confirmation_status,
      new_status: reg.confirmation_status,
      changed_by: 'System',
      remarks: `Certificate automatically generated. Code: ${certCode}`,
      changed_at: new Date().toISOString()
    });

    return certData;
  } catch (error) {
    console.error(`[Certificate Helper] Error generating certificate for registration ${registrationId}:`, error);
    return null;
  }
}

/**
 * Removes a certificate if student loses eligibility
 */
async function removeCertificateIfExists(registrationId) {
  try {
    const existCert = await db.collection('certificates')
      .where('registration_id', '==', parseInt(registrationId))
      .get();
    
    if (!existCert.empty) {
      const cert = existCert.docs[0].data();
      await db.collection('certificates').doc(String(cert.certificate_id)).delete();

      // Log status history
      const historyId = await db.getNextId('registration_status_history');
      await db.collection('registration_status_history').doc(String(historyId)).set({
        history_id: historyId,
        registration_id: parseInt(registrationId),
        previous_status: 'Approved',
        new_status: 'Approved',
        changed_by: 'System',
        remarks: `Certificate automatically revoked (eligibility requirements no longer met).`,
        changed_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`[Certificate Helper] Error revoking certificate for registration ${registrationId}:`, error);
  }
}

/**
 * Runs eligibility checks for all registered students in a specific workshop
 */
async function checkAllWorkshopRegistrations(workshopId) {
  try {
    const regsSnapshot = await db.collection('registrations')
      .where('workshop_id', '==', parseInt(workshopId))
      .get();
    for (const doc of regsSnapshot.docs) {
      const reg = doc.data();
      await checkAndGenerateCertificate(reg.registration_id);
    }
  } catch (error) {
    console.error(`[Certificate Helper] Error checking all registrations for workshop ${workshopId}:`, error);
  }
}

module.exports = {
  checkAndGenerateCertificate,
  removeCertificateIfExists,
  checkAllWorkshopRegistrations
};
