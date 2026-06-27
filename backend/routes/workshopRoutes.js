const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshopController');

router.get('/', workshopController.getWorkshops);
router.put('/:id/status', workshopController.updateWorkshopStatus);

module.exports = router;
