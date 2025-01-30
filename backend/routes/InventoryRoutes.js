const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middlewares/authMiddleware'); // Import the function ✅
const { test, createItem } = require('../controllers/Inventory/InventoryItem');

router.get('/test', authMiddleware, test);
router.post('/create', authMiddleware, createItem);
module.exports = router;