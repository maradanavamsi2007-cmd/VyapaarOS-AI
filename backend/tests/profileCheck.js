const http = require('http');
const express = require('express');
const cors = require('cors');
const db = require('../config/db');

// Instantiate server logic locally for testing
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/admin', require('../routes/adminRoutes'));

let server;

async function runProfileTests() {
  console.log('=== COORDINATOR PROFILE DASHBOARD INTEGRITY TESTS ===');
  
  const PORT = 5002;
  await db.initDb();
  
  // Reset coordinator 1 to default credentials to prevent failures from prior interrupted runs
  try {
    await db.collection('coordinators').doc('1').update({
      name: 'Dr. Amit Varma',
      email: 'amit.varma@sansah.edu',
      phone: '+91 98401 12345',
      department: 'Research & Robotics',
      password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      notification_settings: { email: true, sms: true, reminders: true, alerts: true }
    });
  } catch (resetErr) {
    console.warn('⚠️ Warning: Coordinator reset at startup failed:', resetErr.message);
  }
  
  server = app.listen(PORT, async () => {
    console.log(`Test server active on: http://localhost:${PORT}`);
    const baseUrl = `http://localhost:${PORT}/api/admin`;
    
    try {
      // Test 1: Admin Login with Default Credentials
      console.log('\n[Test 1] Testing Coordinator Login with default credentials...');
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      const loginData = await loginRes.json();
      
      if (loginRes.ok && loginData.success) {
        console.log(`✓ Default Login: SUCCESS (Coordinator: ${loginData.user.name}, Role: ${loginData.user.role})`);
      } else {
        throw new Error(`Default Login failed: ${loginData.message}`);
      }

      // Test 2: Fetch Coordinator Profile
      console.log('\n[Test 2] Testing Profile Retrieval...');
      const profileRes = await fetch(`${baseUrl}/profile`);
      const profileData = await profileRes.json();
      
      if (profileRes.ok && profileData.success) {
        console.log(`✓ Profile Retrieval: SUCCESS (Fetched Name: ${profileData.data.name}, Email: ${profileData.data.email})`);
        if (profileData.data.password) {
          throw new Error('Security flaw: Hashed password leaked in safe profile fetch!');
        }
      } else {
        throw new Error(`Profile Retrieval failed: ${profileData.message}`);
      }

      // Test 3: Update Profile Settings
      console.log('\n[Test 3] Testing Profile Details Modification...');
      const updatePayload = {
        name: 'Dr. Amit Varma HOD',
        email: 'amit.varma.hod@sansah.edu',
        phone: '+91 98401 54321',
        department: 'AI & Robotics Engineering',
        notification_settings: { email: true, sms: false, reminders: true, alerts: true }
      };

      const updateRes = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const updateData = await updateRes.json();
      
      if (updateRes.ok && updateData.success) {
        console.log(`✓ Profile Update: SUCCESS`);
        if (updateData.data.name !== 'Dr. Amit Varma HOD' || updateData.data.notification_settings.sms !== false) {
          throw new Error('Profile update data was not saved correctly.');
        }
      } else {
        throw new Error(`Profile Update failed: ${updateData.message}`);
      }

      // Test 4: Verify login via the new email username
      console.log('\n[Test 4] Testing Login with updated Email username...');
      const updatedEmailLoginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'amit.varma.hod@sansah.edu', password: 'admin123' })
      });
      const updatedEmailLoginData = await updatedEmailLoginRes.json();
      
      if (updatedEmailLoginRes.ok && updatedEmailLoginData.success) {
        console.log(`✓ Updated Username Login: SUCCESS`);
      } else {
        throw new Error(`Updated Username Login failed: ${updatedEmailLoginData.message}`);
      }

      // Test 5: Change Password
      console.log('\n[Test 5] Testing Password Change operation...');
      const passPayload = {
        currentPassword: 'admin123',
        newPassword: 'newAdminPassword789'
      };

      const passRes = await fetch(`${baseUrl}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passPayload)
      });
      const passData = await passRes.json();
      
      if (passRes.ok && passData.success) {
        console.log('✓ Password Change: SUCCESS');
      } else {
        throw new Error(`Password Change failed: ${passData.message}`);
      }

      // Test 6: Verify login with new password
      console.log('\n[Test 6] Testing Login verification with newly changed password...');
      const newPassLoginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'amit.varma.hod@sansah.edu', password: 'newAdminPassword789' })
      });
      const newPassLoginData = await newPassLoginRes.json();
      
      if (newPassLoginRes.ok && newPassLoginData.success) {
        console.log('✓ New Password Login: SUCCESS');
      } else {
        throw new Error(`New Password Login failed: ${newPassLoginData.message}`);
      }

      // Test 7: Fetch Recent Activities Log
      console.log('\n[Test 7] Testing Recent Activities Log Retrieval...');
      const activityRes = await fetch(`${baseUrl}/recent-activities`);
      const activityData = await activityRes.json();
      
      if (activityRes.ok && activityData.success) {
        console.log(`✓ Fetch Recent Activities: SUCCESS (${activityData.data.length} logs fetched)`);
      } else {
        throw new Error(`Recent Activities fetch failed: ${activityData.message}`);
      }

      // Cleanup: Restore default coordinator details and password for further test suites
      console.log('\nRestoring default coordinator settings...');
      const cleanupProfileRes = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Amit Varma',
          email: 'amit.varma@sansah.edu',
          phone: '+91 98401 12345',
          department: 'Research & Robotics',
          notification_settings: { email: true, sms: true, reminders: true, alerts: true }
        })
      });
      
      const cleanupPassRes = await fetch(`${baseUrl}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'newAdminPassword789',
          newPassword: 'admin123'
        })
      });

      if (cleanupProfileRes.ok && cleanupPassRes.ok) {
        console.log('✓ Default settings restored successfully.');
      } else {
        console.warn('⚠ Failed to restore default coordinator settings during cleanup.');
      }

      console.log('\n✓ ALL COORDINATOR PROFILE DASHBOARD TESTS COMPLETED SUCCESSFULLY.');
      server.close();
      process.exit(0);

    } catch (err) {
      console.error('\n✗ Test assertions failed:', err.message);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runProfileTests();
