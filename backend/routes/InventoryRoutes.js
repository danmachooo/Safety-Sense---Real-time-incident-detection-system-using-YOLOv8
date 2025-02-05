const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middlewares/authMiddleware'); // Import the function ✅
const { test, createItem, updateItem, deleteItem, getItem, getAllItems } = require('../controllers/Inventory/InventoryItem');

router.get('/test', authMiddleware, test);
router.get('/get/:id', authMiddleware, getItem);
router.get('/get-all', authMiddleware, getAllItems);
router.post('/create', authMiddleware, createItem);
router.put('/update/:id', authMiddleware, updateItem);
router.delete('/delete/:id', authMiddleware, deleteItem);
module.exports = router;