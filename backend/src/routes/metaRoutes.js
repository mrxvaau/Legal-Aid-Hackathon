const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

router.get('/meta', metaController.getMetadata.bind(metaController));
router.get('/health', metaController.getHealth.bind(metaController));

module.exports = router;
