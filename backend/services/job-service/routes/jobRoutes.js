import express from 'express';
import { jobController } from '../controllers/jobController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:jobId', verifyToken, jobController.getJob);

export default router;
