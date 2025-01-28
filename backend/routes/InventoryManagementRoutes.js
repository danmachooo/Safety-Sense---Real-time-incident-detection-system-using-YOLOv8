const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middlewares/authMiddleware');
const {test} = require('../controllers/Inventory/InventoryItem');

router.get('/test', test);

module.exports = router;