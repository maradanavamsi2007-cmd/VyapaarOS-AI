const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const attendanceController = require('../controllers/attendanceController');

router.post('/login', adminController.login);
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/registrations', adminController.getAllRegistrations);
router.put('/registrations/:id/status', adminController.updateRegistrationStatus);
router.put('/registrations/:id/payment', adminController.updatePaymentStatus);
router.post('/registrations/:id/attendance', adminController.recordAttendance);
router.post('/registrations/:id/submissions', adminController.submitProject);
router.post('/registrations/:id/certificate', adminController.issueCertificate);
router.post('/workshops', adminController.addWorkshop);
router.put('/workshops/:id', adminController.editWorkshop);
router.delete('/workshops/:id', adminController.deleteWorkshop);

// Coordinator Profile routes
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.put('/change-password', adminController.changePassword);
router.get('/recent-activities', adminController.getRecentActivities);

// 7-Day Attendance Management Module routes
router.get('/attendance', attendanceController.getAttendanceList);
router.post('/attendance', attendanceController.recordAttendance);
router.post('/attendance/bulk', attendanceController.recordBulkAttendance);
router.get('/attendance/stats', attendanceController.getAttendanceStats);
router.get('/attendance/reports', attendanceController.getAttendanceReport);

module.exports = router;
