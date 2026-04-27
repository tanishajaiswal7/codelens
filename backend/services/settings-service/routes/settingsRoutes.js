import express from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

// All settings routes require authentication
router.use(verifyToken);

// GET /api/settings - Get user settings
router.get('/', settingsController.getSettings);

// PUT /api/settings - Update user settings
router.put('/', settingsController.updateSettings);

export default router;
