const db = require('../config/db');
const { checkAndGenerateCertificate } = require('../utils/certificateHelper');

async function runTests() {
  console.log('=== AUTOMATIC WORKSHOP CERTIFICATE GENERATION TEST ===\n');

  try {
    // 1. Initialize DB connection
    await db.initDb();
    console.log('✓ Database initialization: SUCCESS');

    // Clean up student 1 workshop 1 certificate and attendance records first
    const certs = await db.collection('certificates')
      .where('registration_id', '==', 1)
      .get();
    for (const doc of certs.docs) {
      await db.collection('certificates').doc(doc.id).delete();
    }
    
    const atts = await db.collection('student_attendance')
      .where('student_id', '==', 1)
      .where('workshop_id', '==', 1)
      .get();
    for (const doc of atts.docs) {
      await db.collection('student_attendance').doc(doc.id).delete();
    }
    
    console.log('✓ Cleaned up existing test data.');

    // Fetch workshop 1 and make sure it starts as Completed
    const workshopDoc = await db.collection('workshops').doc('1').get();
    const originalWorkshopStatus = workshopDoc.exists ? workshopDoc.data().status : 'Active';
    await db.collection('workshops').doc('1').update({ status: 'Completed' });
    console.log('✓ Seeded workshop status as Completed.');

    // Fetch registration 1 and make sure it is Approved
    const regDoc = await db.collection('registrations').doc('1').get();
    const originalRegStatus = regDoc.exists ? regDoc.data().confirmation_status : 'Pending';
    await db.collection('registrations').doc('1').update({ confirmation_status: 'Approved' });
    console.log('✓ Seeded registration status as Approved.');

    // [Test 1] Test with low attendance (no attendance records logged yet -> 0% attendance)
    console.log('\n[Test 1] Evaluating certificate with 0% attendance...');
    let cert = await checkAndGenerateCertificate(1);
    if (cert !== null) {
      throw new Error('Certificate was generated but student has 0% attendance!');
    }
    console.log('✓ Student with 0% attendance successfully blocked.');

    // [Test 2] Log attendance below 90% (e.g. 5 out of 7 days: Present)
    console.log('\n[Test 2] Logging 5 days of attendance (71.43% attendance)...');
    for (let day = 1; day <= 5; day++) {
      const attId = await db.getNextId('student_attendance');
      await db.collection('student_attendance').doc(String(attId)).set({
        id: attId,
        student_id: 1,
        workshop_id: 1,
        day_number: day,
        attendance_date: '2026-06-25',
        status: 'Present',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    cert = await checkAndGenerateCertificate(1);
    if (cert !== null) {
      throw new Error('Certificate was generated but student has only 71.43% attendance!');
    }
    console.log('✓ Student with 71.43% attendance successfully blocked.');

    // [Test 3] Log attendance to 100% (7 out of 7 days: Present)
    console.log('\n[Test 3] Logging remaining 2 days of attendance (100% attendance)...');
    for (let day = 6; day <= 7; day++) {
      const attId = await db.getNextId('student_attendance');
      await db.collection('student_attendance').doc(String(attId)).set({
        id: attId,
        student_id: 1,
        workshop_id: 1,
        day_number: day,
        attendance_date: '2026-06-25',
        status: 'Present',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    cert = await checkAndGenerateCertificate(1);
    if (cert === null) {
      throw new Error('Certificate was not generated though student has 100% attendance and workshop is Completed!');
    }
    console.log('✓ Certificate successfully generated automatically!');
    console.log(`  - Certificate Code: ${cert.certificate_code}`);
    console.log(`  - Attendance Percentage: ${cert.attendance_percentage}%`);

    // [Test 4] Change workshop status to Active
    console.log('\n[Test 4] Setting workshop status to Active (not completed)...');
    await db.collection('workshops').doc('1').update({ status: 'Active' });
    
    cert = await checkAndGenerateCertificate(1);
    if (cert !== null) {
      throw new Error('Certificate is still active but workshop is Active (not Completed)!');
    }
    
    // Check if certificate was deleted from DB
    const checkCert = await db.collection('certificates')
      .where('registration_id', '==', 1)
      .get();
    if (!checkCert.empty) {
      throw new Error('Certificate record was not deleted from database!');
    }
    console.log('✓ Certificate automatically revoked on workshop status change.');

    // [Test 5] Set workshop status back to Completed and check if it generates again
    console.log('\n[Test 5] Re-setting workshop status to Completed...');
    await db.collection('workshops').doc('1').update({ status: 'Completed' });
    cert = await checkAndGenerateCertificate(1);
    if (cert === null) {
      throw new Error('Certificate failed to regenerate when workshop status was restored to Completed!');
    }
    console.log('✓ Certificate successfully regenerated.');

    // [Test 6] Revoke Approved verification status
    console.log('\n[Test 6] Revoking Approved verification status (setting to Pending)...');
    await db.collection('registrations').doc('1').update({ confirmation_status: 'Pending' });
    cert = await checkAndGenerateCertificate(1);
    if (cert !== null) {
      throw new Error('Certificate is still active though registration status was set to Pending!');
    }
    const checkCert2 = await db.collection('certificates')
      .where('registration_id', '==', 1)
      .get();
    if (!checkCert2.empty) {
      throw new Error('Certificate record was not deleted from database!');
    }
    console.log('✓ Certificate automatically revoked on registration status change.');

    // Reset workshop, registration status, and clean up test entries
    await db.collection('workshops').doc('1').update({ status: originalWorkshopStatus });
    await db.collection('registrations').doc('1').update({ confirmation_status: originalRegStatus });
    
    const finalCerts = await db.collection('certificates')
      .where('registration_id', '==', 1)
      .get();
    for (const doc of finalCerts.docs) {
      await db.collection('certificates').doc(doc.id).delete();
    }
    const finalAtts = await db.collection('student_attendance')
      .where('student_id', '==', 1)
      .where('workshop_id', '==', 1)
      .get();
    for (const doc of finalAtts.docs) {
      await db.collection('student_attendance').doc(doc.id).delete();
    }

    console.log('\n======================================================');
    console.log('✓ ALL CERTIFICATE INTEGRITY DIAGNOSTIC TESTS PASSED.');
    console.log('======================================================\n');

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC TESTS FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
