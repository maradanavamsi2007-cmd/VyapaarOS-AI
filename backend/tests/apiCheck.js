const http = require('http');
const express = require('express');
const cors = require('cors');
const db = require('../config/db');

// Instantiate server logic locally for testing
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/workshops', require('../routes/workshopRoutes'));
app.use('/api/registrations', require('../routes/registrationRoutes'));
app.use('/api/admin', require('../routes/adminRoutes'));
app.use('/api/ai', require('../routes/aiRoutes'));
app.use('/api/students', require('../routes/studentRoutes'));

let server;

async function runAPITests() {
  console.log('=== API ENDPOINTS INTEGRITY TEST (PHASE 2 ENHANCED) ===');
  
  // Start server on a test port
  const PORT = 5001;
  await db.initDb();
  
  server = app.listen(PORT, async () => {
    console.log(`Test server active on: http://localhost:${PORT}`);
    const baseUrl = `http://localhost:${PORT}/api`;
    
    try {
      // Test 1: Fetch Workshops
      console.log('\n[Test 1] Querying Workshops List...');
      const wRes = await fetch(`${baseUrl}/workshops`);
      const wData = await wRes.json();
      if (wRes.ok && wData.success) {
        console.log(`✓ Get Workshops: SUCCESS (${wData.data.length} workshops fetched)`);
      } else {
        throw new Error('Get Workshops failed');
      }

      // Test 2: Student Account Creation (Signup)
      console.log('\n[Test 2] Testing Student Account Creation (Signup)...');
      const signupPayload = {
        name: 'Jane Doe',
        email: 'jane.doe@api-test.com',
        phone: '9845600000',
        collegeName: 'Anna University, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        branch: 'Computer Technology',
        semester: 'Semester 3',
        password: 'securePassword123'
      };

      const sSignupRes = await fetch(`${baseUrl}/students/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload)
      });
      const sSignupData = await sSignupRes.json();
      
      if (sSignupRes.status === 201 && sSignupData.success) {
        console.log(`✓ Student Signup: SUCCESS (Assigned Token: ${sSignupData.token})`);
      } else {
        throw new Error(`Student Signup failed: ${sSignupData.message}`);
      }

      // Test 3: Student Login
      console.log('\n[Test 3] Testing Student Authentication (Login)...');
      const loginPayload = {
        email: 'jane.doe@api-test.com',
        password: 'securePassword123'
      };

      const sLoginRes = await fetch(`${baseUrl}/students/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });
      const sLoginData = await sLoginRes.json();
      
      let studentToken = '';
      if (sLoginRes.status === 200 && sLoginData.success) {
        studentToken = sLoginData.token;
        console.log(`✓ Student Login: SUCCESS (Retrieved Session Token: ${studentToken})`);
      } else {
        throw new Error(`Student Login failed: ${sLoginData.message}`);
      }

      // Test 4: Retrieve Logged-in student dashboard
      console.log('\n[Test 4] Querying Student Dashboard Profile...');
      const sDashRes = await fetch(`${baseUrl}/students/my-registrations`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      const sDashData = await sDashRes.json();
      
      if (sDashRes.ok && sDashData.success) {
        console.log(`✓ Get Student Dashboard: SUCCESS (Profile: ${sDashData.data.profile.name}, Enrollments: ${sDashData.data.registrations.length})`);
      } else {
        throw new Error(`Student Dashboard fetch failed: ${sDashData.message}`);
      }

      // Test 5: Admin Add new Workshop
      console.log('\n[Test 5] Adding Workshop via Admin CRUD...');
      const newWorkshopPayload = {
        title: 'Quantum Computing Fundamentals',
        description: 'Introduction to qubits, quantum logic gates, and IBM Qiskit platforms.',
        capacity: 25,
        trainerName: 'Dr. Evelyn Foster',
        fee: 1999.00,
        image_url: 'https://example.com/quantum.jpg',
        deadline: '2026-10-15 23:59:59',
        schedule: 'Mon-Wed 10:00 AM',
        venue: 'Quantum Computing Lab, 4th Floor'
      };

      const wAddRes = await fetch(`${baseUrl}/admin/workshops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkshopPayload)
      });
      const wAddData = await wAddRes.json();
      
      let createdWorkshopId;
      if (wAddRes.status === 201 && wAddData.success) {
        createdWorkshopId = wAddData.data.workshop_id;
        console.log(`✓ Admin Add Workshop: SUCCESS (Allocated Workshop ID: ${createdWorkshopId})`);
      } else {
        throw new Error(`Admin Add Workshop failed: ${wAddData.message}`);
      }

      // Test 6: Admin Edit Workshop
      console.log('\n[Test 6] Editing Workshop details...');
      const editWorkshopPayload = {
        title: 'Quantum Computing Fundamentals',
        description: 'Introduction to qubits, quantum logic gates, and IBM Qiskit platforms.',
        capacity: 35, // increased capacity
        status: 'Active',
        trainerName: 'Dr. Evelyn Foster',
        fee: 1799.00, // discounted fee
        image_url: 'https://example.com/quantum-new.jpg',
        deadline: '2026-10-15 23:59:59',
        schedule: 'Mon-Wed 10:00 AM',
        venue: 'Quantum Research Wing, Room 402'
      };

      const wEditRes = await fetch(`${baseUrl}/admin/workshops/${createdWorkshopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editWorkshopPayload)
      });
      const wEditData = await wEditRes.json();
      
      if (wEditRes.ok && wEditData.success) {
        console.log('✓ Admin Edit Workshop: SUCCESS');
      } else {
        throw new Error(`Admin Edit Workshop failed: ${wEditData.message}`);
      }

      // Test 7: Admin Delete Workshop
      console.log('\n[Test 7] Deleting Workshop...');
      const wDelRes = await fetch(`${baseUrl}/admin/workshops/${createdWorkshopId}`, {
        method: 'DELETE'
      });
      const wDelData = await wDelRes.json();
      
      if (wDelRes.ok && wDelData.success) {
        console.log('✓ Admin Delete Workshop: SUCCESS');
      } else {
        throw new Error(`Admin Delete Workshop failed: ${wDelData.message}`);
      }

      console.log('\n✓ ALL PHASE 2 API VERIFICATION TESTS COMPLETED SUCCESSFULLY.');
      server.close();
      process.exit(0);

    } catch (err) {
      console.error('\n✗ API Test suite failed on assertion:', err.message);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runAPITests();
