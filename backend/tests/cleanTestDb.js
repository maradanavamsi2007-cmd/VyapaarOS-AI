const db = require('../config/db');

async function cleanDb() {
  console.log('=== CLEANING TEST RECORDS IN DATABASE ===');
  
  try {
    await db.initDb();

    // 1. Delete Test Students and their registrations
    const testEmails = ['jane.doe@api-test.com', 'sasikumark0406@gmail.com', 'teststudent@example.com'];
    for (const email of testEmails) {
      const students = await db.collection('students').where('email', '==', email).get();
      if (!students.empty) {
        for (const doc of students.docs) {
          console.log(`Deleting student ${doc.id} (${doc.data().email})`);
          
          // Delete registrations of student
          const regs = await db.collection('registrations').where('student_id', '==', parseInt(doc.id)).get();
          for (const rDoc of regs.docs) {
            console.log(`Deleting registration ${rDoc.id} for student`);
            await db.collection('registrations').doc(rDoc.id).delete();
          }

          await db.collection('students').doc(doc.id).delete();
        }
        console.log(`✓ Test student ${email} and registrations deleted successfully.`);
      }
    }

    // 2. Delete Test Colleges
    const testColleges = ['Sansah Innovations College', 'Test Engineering College'];
    for (const collegeName of testColleges) {
      const colleges = await db.collection('colleges').where('name', '==', collegeName).get();
      if (!colleges.empty) {
        for (const doc of colleges.docs) {
          console.log(`Deleting college ${doc.id} (${doc.data().name})`);
          await db.collection('colleges').doc(doc.id).delete();
        }
        console.log(`✓ Test college ${collegeName} deleted successfully.`);
      }
    }

    // 3. Delete Workshop "Quantum Computing Fundamentals"
    const workshops = await db.collection('workshops').where('title', '==', 'Quantum Computing Fundamentals').get();
    if (!workshops.empty) {
      for (const doc of workshops.docs) {
        console.log(`Deleting workshop ${doc.id} (${doc.data().title})`);
        await db.collection('workshops').doc(doc.id).delete();
      }
      console.log('✓ Test workshop deleted successfully.');
    } else {
      console.log('No test workshop found to delete.');
    }

    console.log('=== CLEANUP COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('✗ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanDb();
