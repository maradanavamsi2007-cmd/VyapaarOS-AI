const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

router.get('/dashboard', businessController.getDashboardData);
router.post('/ocr-scan', businessController.scanInvoice);
router.post('/voice-command', businessController.voiceCommand);
router.post('/twin-simulate', businessController.twinSimulate);
router.post('/approve-po', businessController.approvePO);
router.post('/campaign-dispatch', businessController.dispatchCampaign);
router.post('/whatsapp-direct', businessController.whatsappDirect);

module.exports = router;
