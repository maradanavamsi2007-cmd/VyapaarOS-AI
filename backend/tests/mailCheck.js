const db = require('../config/db');
const mailer = require('../utils/mailer');
const registrationController = require('../controllers/registrationController');

async function runMailCheck() {
  console.log('=== Mailer Verification Test ===');
  await db.initDb();
  
  // Define mock request and response
  const req = {
    body: {
      name: 'Test Student',
      collegeName: 'Test Engineering College',
      city: 'Chennai',
      state: 'Tamil Nadu',
      email: 'teststudent@example.com',
      phone: '9999999999',
      branch: 'ECE',
      semester: 'Semester 5',
      workshopId: 1, // IoT Workshop
      isGroup: false
    }
  };
  
  const res = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('Response Status:', this.statusCode);
      console.log('Response Data:', JSON.stringify(data, null, 2));
      return this;
    }
  };
  
  try {
    // We need to make sure the student with this email is NOT already registered for workshop 1,
    // or we can delete their registration first from the db to allow successful registration.
    const studentRows = await db.query('SELECT student_id FROM students WHERE email = ?', ['teststudent@example.com']);
    if (studentRows.length > 0) {
      await db.query('DELETE FROM registrations WHERE student_id = ? AND workshop_id = 1', [studentRows[0].student_id]);
    }
    
    console.log('Calling registration controller...');
    await registrationController.registerWorkshop(req, res);
    
    // Give nodemailer some time to log / complete sending
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Verification completed.');
    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

runMailCheck();
