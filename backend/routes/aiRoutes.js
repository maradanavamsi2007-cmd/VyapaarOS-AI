const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/registration-msg/:id', aiController.generateConfirmationMsg);
router.get('/joining-instructions/:id', aiController.generateJoiningInstructions);
router.get('/coordinator-notes/:id', aiController.generateCoordinatorNotes);
router.get('/recommendations', aiController.provideRecommendations);

module.exports = router;
