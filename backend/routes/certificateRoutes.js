const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const studentController = require('../controllers/studentController');

// Simple Admin Authenticator Middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== 'mock-jwt-token-for-sansah-innovations-admin') {
    return res.status(401).json({ success: false, message: 'Invalid admin session token.' });
  }
  next();
}

// Public Route (Read-Only unauthenticated)
router.get('/verify/:codeOrId', certificateController.verifyCertificate);
router.get('/download/:code', certificateController.downloadCertificate);

// Student Route (Authenticated)
router.get('/my-certificates', studentController.authenticateStudent, certificateController.getMyCertificates);

// Admin Routes (Authenticated)
router.get('/admin/list', authenticateAdmin, certificateController.getCertificatesList);
router.post('/admin/regenerate/:regId', authenticateAdmin, certificateController.regenerateCertificate);
router.post('/admin/issue/:regId', authenticateAdmin, certificateController.issueCertificate);
router.post('/admin/revoke/:regId', authenticateAdmin, certificateController.revokeCertificate);
router.post('/admin/reissue/:regId', authenticateAdmin, certificateController.reissueCertificate);

module.exports = router;
