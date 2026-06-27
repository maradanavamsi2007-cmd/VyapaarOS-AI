const db = require('../config/db');
const attendanceController = require('../controllers/attendanceController');
const adminController = require('../controllers/adminController');

async function runTests() {
  console.log('=== ATTENDANCE MODULE INTEGRITY DIAGNOSTIC TEST ===\n');

  try {
    // Initialize DB connection
    await db.initDb();
    console.log('✓ Database initialization: SUCCESS');

    // 1. Clear any existing student attendance test records to prevent conflicts
    // Let's delete test entries for student 1 & workshop 1
    const testRecords = await db.collection('student_attendance')
      .where('student_id', '==', 1)
      .where('workshop_id', '==', 1)
      .get();
    
    for (const doc of testRecords.docs) {
      await db.collection('student_attendance').doc(doc.id).delete();
    }
    console.log('✓ Cleaned up existing test attendance records.');

    // 2. Test 1: Record individual attendance (Present)
    console.log('\n[Test 1] Recording individual attendance (Day 1 - Present)...');
    const req1 = {
      body: {
        studentId: 1,
        workshopId: 1,
        dayNumber: 1,
        date: '2026-06-25',
        status: 'Present'
      }
    };
    
    let resMsg = '';
    const res1 = {
      status: (code) => ({ json: (data) => { throw new Error(data.message); } }),
      json: (data) => { resMsg = data.message; }
    };
    
    await attendanceController.recordAttendance(req1, res1);
    console.log('✓ Individual attendance record: SUCCESS');

    // Verify it exists in DB
    const check1 = await db.collection('student_attendance')
      .where('student_id', '==', 1)
      .where('workshop_id', '==', 1)
      .where('day_number', '==', 1)
      .get();
    
    if (check1.empty || check1.docs[0].data().status !== 'Present') {
      throw new Error('Attendance not found in database or incorrect status.');
    }
    console.log('✓ DB confirmation of record status: Present');

    // 3. Test 2: Duplicate check / Update existing record
    console.log('\n[Test 2] Testing duplicate upsert (Day 1 - Update to Absent)...');
    const req2 = {
      body: {
        studentId: 1,
        workshopId: 1,
        dayNumber: 1,
        date: '2026-06-25',
        status: 'Absent'
      }
    };
    await attendanceController.recordAttendance(req2, res1);
    
    const check2 = await db.collection('student_attendance')
      .where('student_id', '==', 1)
      .where('workshop_id', '==', 1)
      .where('day_number', '==', 1)
      .get();
    
    if (check2.size !== 1 || check2.docs[0].data().status !== 'Absent') {
      throw new Error(`Duplicate prevention failed. Count: ${check2.size}, Status: ${check2.docs[0]?.data()?.status}`);
    }
    console.log('✓ Successfully prevented duplicates & updated status to: Absent');

    // Restore Day 1 to Present for eligibility checks
    req1.body.status = 'Present';
    await attendanceController.recordAttendance(req1, res1);

    // 4. Test 3: Bulk attendance marking
    console.log('\n[Test 3] Recording bulk attendance for students [1, 2] on Day 2...');
    // Make sure student 2 has no records for day 2
    const clean2 = await db.collection('student_attendance')
      .where('student_id', '==', 2)
      .where('workshop_id', '==', 1)
      .where('day_number', '==', 2)
      .get();
    for (const doc of clean2.docs) {
      await db.collection('student_attendance').doc(doc.id).delete();
    }

    const req3 = {
      body: {
        studentIds: [1, 2],
        workshopId: 1,
        dayNumber: 2,
        date: '2026-06-25',
        status: 'Present'
      }
    };
    await attendanceController.recordBulkAttendance(req3, res1);
    
    const checkBulk1 = await db.collection('student_attendance')
      .where('workshop_id', '==', 1)
      .where('day_number', '==', 2)
      .get();
    
    if (checkBulk1.size < 2) {
      throw new Error(`Bulk marking failed. Found only ${checkBulk1.size} records.`);
    }
    console.log(`✓ Bulk attendance verification: SUCCESS (${checkBulk1.size} records updated)`);

    // 5. Test 4: Check eligibility (Expected: BLOCK)
    console.log('\n[Test 4] Testing certificate eligibility constraint...');
    console.log('  - Student currently has 2 days marked Present (Day 1, Day 2).');
    console.log('  - Expected: Certificate request rejected (requires >= 90%, i.e. 7 days).');
    
    const reqCert = {
      params: { id: 1 } // registration ID 1
    };
    let errorCaught = false;
    let errorMsg = '';
    const resCert = {
      status: (code) => {
        if (code === 400) {
          errorCaught = true;
        }
        return { json: (data) => { errorMsg = data.message; } };
      },
      json: (data) => {
        throw new Error('Certificate was incorrectly issued without sufficient attendance!');
      }
    };

    // Before we call issueCertificate, let's make sure registration is Approved and workshop is Completed
    await db.collection('registrations').doc('1').update({ confirmation_status: 'Approved' });
    const wsDoc = await db.collection('workshops').doc('1').get();
    const origStatus = wsDoc.exists ? wsDoc.data().status : 'Active';
    await db.collection('workshops').doc('1').update({ status: 'Completed' });
    
    // Clean any pre-existing certificates for registration 1 to ensure a clean run
    const certsCheck = await db.collection('certificates').where('registration_id', '==', 1).get();
    for (const doc of certsCheck.docs) {
      await db.collection('certificates').doc(doc.id).delete();
    }

    await adminController.issueCertificate(reqCert, resCert);
    
    if (!errorCaught) {
      throw new Error('Certificate eligibility rule failed to block certificate issuance.');
    }
    console.log(`✓ Certificate eligibility check blocked as expected. Message: "${errorMsg}"`);

    // 6. Test 5: Mark up to 90% attendance (Day 3 to Day 7 marked Present)
    console.log('\n[Test 5] Marking student present for Day 3 to 7 (7/7 days Present = 100%)...');
    for (let day = 3; day <= 7; day++) {
      await attendanceController.recordAttendance({
        body: {
          studentId: 1,
          workshopId: 1,
          dayNumber: day,
          date: '2026-06-25',
          status: 'Present'
        }
      }, res1);
    }
    console.log('✓ Student attendance logged for Days 3 to 7.');

    // 7. Test 6: Re-test certificate eligibility (Expected: SUCCESS)
    console.log('\n[Test 6] Re-testing certificate eligibility after logging 7 days Present...');
    let certIssued = false;
    const resCertSuccess = {
      status: (code) => ({ json: (data) => { throw new Error(data.message); } }),
      json: (data) => {
        if (data.success) {
          certIssued = true;
          resMsg = data.message;
        }
      }
    };

    await adminController.issueCertificate(reqCert, resCertSuccess);
    if (!certIssued) {
      throw new Error('Failed to issue certificate for eligible student!');
    }
    console.log(`✓ Certificate successfully issued: SUCCESS. Message: "${resMsg}"`);

    // Clean up test certificate
    const certsClean = await db.collection('certificates').where('registration_id', '==', 1).get();
    for (const doc of certsClean.docs) {
      await db.collection('certificates').doc(doc.id).delete();
    }

    // Reset workshop status
    await db.collection('workshops').doc('1').update({ status: origStatus });

    console.log('\n======================================================');
    console.log('✓ ALL MODULE INTEGRITY DIAGNOSTIC TESTS PASSED SUCCESSFULLY.');
    console.log('======================================================');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Diagnostic verification failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
