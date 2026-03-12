const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

// Batch Sync
router.post('/batch', playerController.saveBatchPlayers);

router.post('/', playerController.savePlayer);
router.get('/:id', playerController.getPlayer);
router.get('/', playerController.getAllPlayers);

module.exports = router;
