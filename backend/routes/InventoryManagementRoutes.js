const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middlewares/authMiddleware');
const inventoryController = require('../controllers/Inventory/InventoryItem');

router.post('/test', authMiddleware, inventoryController.test());