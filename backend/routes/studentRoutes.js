const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.post('/signup', studentController.signup);
router.post('/login', studentController.login);
router.get('/my-registrations', studentController.authenticateStudent, studentController.getMyRegistrations);
router.post('/submissions/:regId', studentController.authenticateStudent, studentController.submitProject);
router.get('/notifications', studentController.authenticateStudent, studentController.getNotifications);
router.post('/notifications/:id/read', studentController.authenticateStudent, studentController.markNotificationRead);

module.exports = router;
