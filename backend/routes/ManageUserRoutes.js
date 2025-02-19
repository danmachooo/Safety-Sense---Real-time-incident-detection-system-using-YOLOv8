const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const { getUser, getUsers, updateUser, softDeleteUser, restoreUser, getDeletedUsers } = require('../controllers/Users/ManageUser');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.get('/get/:id', authMiddleware, adminMiddleware, getUser);
router.get('/get-all', getUsers);
router.get('/get-deleted', authMiddleware, adminMiddleware, getDeletedUsers);
router.put('/update/:id', authMiddleware, adminMiddleware, updateUser)
router.patch('/soft-delete/:id', authMiddleware, adminMiddleware, softDeleteUser);
router.patch('/restore/:id', authMiddleware, adminMiddleware, restoreUser);
// router.get('/search', authMiddleware, adminMiddleware, searchUsers);

module.exports = router;