const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

router.post('/register', registrationController.registerWorkshop);
router.get('/:id', registrationController.getRegistrationDetails);

module.exports = router;
