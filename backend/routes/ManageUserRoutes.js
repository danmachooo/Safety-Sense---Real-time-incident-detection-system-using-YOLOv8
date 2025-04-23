const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const { getUser, getUsers, updateUser, softDeleteUser, restoreUser, getDeletedUsers, createUser } = require('../controllers/Users/ManageUser');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post('/create', createUser); //ok
router.get('/get/:id', authMiddleware, adminMiddleware, getUser); //ok
router.get('/get-all',  authMiddleware, adminMiddleware, getUsers); //ok
router.get('/get-deleted', authMiddleware, adminMiddleware, getDeletedUsers); //not yet
router.put('/update/:id', authMiddleware, updateUser) // ok
router.delete('/soft-delete/:id', authMiddleware, adminMiddleware, softDeleteUser); // not yet
router.patch('/restore/:id', authMiddleware, adminMiddleware, restoreUser); // not yet
// router.get('/search', authMiddleware, adminMiddleware, searchUsers);

module.exports = router;