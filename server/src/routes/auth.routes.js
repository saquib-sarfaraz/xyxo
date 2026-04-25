import express from 'express';
import { login, refresh, logout, signup } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', verifyToken, logout);
router.post('/signup', signup);

export default router;