const http = require('http');
const express = require('express');
const cors = require('cors');
const db = require('../config/db');
const { checkAndGenerateCertificate } = require('../utils/certificateHelper');

// Instantiate server logic locally for testing
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/certificates', require('../routes/certificateRoutes'));
app.use('/api/students', require('../routes/studentRoutes'));

let server;

async function runApprovalTests() {
  console.log('=== COORDINATOR CERTIFICATE APPROVAL WORKFLOW INTEGRITY TESTS ===');
  
  const PORT = 5003;
  await db.initDb();
  
  // Setup clean state for test run
  // 1. Make sure student 1 is Approved for workshop 1, and workshop 1 is Completed
  await db.collection('registrations').doc('1').update({ confirmation_status: 'Approved' });
  await db.collection('workshops').doc('1').update({ status: 'Completed' });
  
  // 2. Ensure student has 7 days of attendance logged (100% presence)
  const atts = await db.collection('student_attendance')
    .where('student_id', '==', 1)
    .where('workshop_id', '==', 1)
    .get();
  for (const doc of atts.docs) {
    await db.collection('student_attendance').doc(doc.id).delete();
  }
  for (let day = 1; day <= 7; day++) {
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

  // 3. Delete any pre-existing certificates for registration 1
  const existingCerts = await db.collection('certificates')
    .where('registration_id', '==', 1)
    .get();
  for (const doc of existingCerts.docs) {
    await db.collection('certificates').doc(doc.id).delete();
  }

  // 4. Delete any notifications for student 1
  const existingNotifs = await db.collection('notifications')
    .where('student_id', '==', 1)
    .get();
  for (const doc of existingNotifs.docs) {
    await db.collection('notifications').doc(doc.id).delete();
  }
  
  console.log('✓ Clean test environment prepared.');

  server = app.listen(PORT, async () => {
    console.log(`Test server active on: http://localhost:${PORT}`);
    const baseUrl = `http://localhost:${PORT}/api`;
    const adminHeaders = { 'Authorization': 'Bearer mock-jwt-token-for-sansah-innovations-admin', 'Content-Type': 'application/json' };
    const studentHeaders = { 'Authorization': 'Bearer mock-student-jwt-token-1', 'Content-Type': 'application/json' };

    try {
      // Test 1: Generate certificate in Eligible status automatically
      console.log('\n[Test 1] Generating certificate automatically via helper...');
      const cert = await checkAndGenerateCertificate(1);
      if (!cert) {
        throw new Error('Certificate helper failed to generate certificate for eligible student');
      }
      console.log(`✓ Certificate generated: Code: ${cert.certificate_code}, Status: ${cert.status}`);
      if (cert.status !== 'Eligible') {
        throw new Error(`Expected initial status to be 'Eligible', got '${cert.status}'`);
      }

      // Test 2: Verify public verify route blocks unissued certificate
      console.log('\n[Test 2] Querying public verification for unissued certificate...');
      const verifyRes = await fetch(`${baseUrl}/certificates/verify/${cert.certificate_code}`);
      if (verifyRes.status !== 404) {
        throw new Error(`Expected public verification to return 404 for unissued certificate, got status ${verifyRes.status}`);
      }
      console.log('✓ Public verification successfully blocked download / verification of unissued certificate.');

      // Test 3: Verify student portal my-certificates blocks download
      console.log('\n[Test 3] Fetching student certificates view for unissued state...');
      const studentCertsRes = await fetch(`${baseUrl}/certificates/my-certificates`, { headers: studentHeaders });
      const studentCertsData = await studentCertsRes.json();
      if (!studentCertsRes.ok) {
        throw new Error(`Student certificates fetch failed: ${studentCertsData.message}`);
      }
      
      const studentItem = studentCertsData.data.find(d => d.registration_id === 1);
      if (!studentItem) {
        throw new Error('Student registration 1 not found in certificates list');
      }
      
      console.log(`✓ Student eligibility status is: ${studentItem.eligibility_status}`);
      console.log(`✓ Student eligibility reason is: "${studentItem.eligibility_reason}"`);
      if (studentItem.eligibility_status !== 'Eligible') {
        throw new Error(`Expected student eligibility status to be 'Eligible', got '${studentItem.eligibility_status}'`);
      }
      if (studentItem.certificate !== null) {
        throw new Error('Security breach: Student was able to access certificate details before coordinator approval/issuance!');
      }
      console.log('✓ Student dashboard successfully blocked certificate access.');

      // Test 4: Coordinator Issues Certificate
      console.log('\n[Test 4] Coordinator issuing certificate via admin endpoint...');
      const issueRes = await fetch(`${baseUrl}/certificates/admin/issue/1`, { method: 'POST', headers: adminHeaders });
      const issueData = await issueRes.json();
      if (!issueRes.ok) {
        throw new Error(`Issue Certificate failed: ${issueData.message}`);
      }
      console.log(`✓ Issue Certificate: SUCCESS. Status is now: ${issueData.data.status}`);
      if (issueData.data.status !== 'Issued' || issueData.data.issued_by !== 'Dr. Amit Varma') {
        throw new Error('Certificate status or issued metadata was not updated correctly.');
      }

      // Test 5: Verify public verify route now returns valid details
      console.log('\n[Test 5] Querying public verification for officially issued certificate...');
      const verifyIssuedRes = await fetch(`${baseUrl}/certificates/verify/${cert.certificate_code}`);
      const verifyIssuedData = await verifyIssuedRes.json();
      if (!verifyIssuedRes.ok) {
        throw new Error(`Public verification failed for issued certificate: ${verifyIssuedData.message}`);
      }
      console.log(`✓ Public verification success. Status: ${verifyIssuedData.data.verification_status}, Issued to: ${verifyIssuedData.data.student_name}`);

      // Test 6: Verify student portal retrieves the issued certificate details
      console.log('\n[Test 6] Fetching student certificates view for issued state...');
      const studentCertsIssuedRes = await fetch(`${baseUrl}/certificates/my-certificates`, { headers: studentHeaders });
      const studentCertsIssuedData = await studentCertsIssuedRes.json();
      const studentIssuedItem = studentCertsIssuedData.data.find(d => d.registration_id === 1);
      
      if (!studentIssuedItem.certificate) {
        throw new Error('Student was still unable to retrieve certificate details after issuance.');
      }
      console.log(`✓ Student dashboard credential retrieval success. Certificate Number: ${studentIssuedItem.certificate.certificate_code}`);

      // Test 7: Verify Student Notification is received
      console.log('\n[Test 7] Checking in-app student notifications feed...');
      const notifsRes = await fetch(`${baseUrl}/students/notifications`, { headers: studentHeaders });
      const notifsData = await notifsRes.json();
      if (!notifsRes.ok) {
        throw new Error(`Student notifications fetch failed: ${notifsData.message}`);
      }
      
      const certNotif = notifsData.data.find(n => n.type === 'certificate');
      if (!certNotif) {
        throw new Error('No certificate issuance notification found in student notification log.');
      }
      console.log(`✓ Notification found: "${certNotif.message}" (Read state: ${certNotif.is_read})`);

      // Test 8: Coordinator Revokes Certificate
      console.log('\n[Test 8] Coordinator revoking certificate via admin endpoint...');
      const revokeRes = await fetch(`${baseUrl}/certificates/admin/revoke/1`, { method: 'POST', headers: adminHeaders });
      if (!revokeRes.ok) {
        throw new Error('Revoke certificate failed');
      }
      
      const verifyRevokedRes = await fetch(`${baseUrl}/certificates/verify/${cert.certificate_code}`);
      if (verifyRevokedRes.status !== 404) {
        throw new Error(`Expected verification to return 404 after revocation, got status ${verifyRevokedRes.status}`);
      }
      console.log('✓ Certificate successfully revoked and blocked from public registry.');

      // Test 9: Coordinator Reissues Certificate
      console.log('\n[Test 9] Coordinator reissuing certificate via admin endpoint...');
      const reissueRes = await fetch(`${baseUrl}/certificates/admin/reissue/1`, { method: 'POST', headers: adminHeaders });
      const reissueData = await reissueRes.json();
      if (!reissueRes.ok) {
        throw new Error(`Reissue Certificate failed: ${reissueData.message}`);
      }
      
      const verifyReissuedRes = await fetch(`${baseUrl}/certificates/verify/${cert.certificate_code}`);
      if (!verifyReissuedRes.ok) {
        throw new Error('Reissued certificate could not be verified on public portal.');
      }
      console.log(`✓ Certificate successfully reissued. New Issue date: ${reissueData.data.issue_date}`);

      console.log('\n========================================================================');
      console.log('✓ ALL COORDINATOR CERTIFICATE APPROVAL WORKFLOW DIAGNOSTIC TESTS PASSED.');
      console.log('========================================================================\n');
      
      server.close();
      process.exit(0);

    } catch (err) {
      console.error('\n✗ Test assertions failed:', err.message);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runApprovalTests();
