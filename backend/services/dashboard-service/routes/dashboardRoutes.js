import express from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(verifyToken);

// GET /api/dashboard/:workspaceId - Get workspace stats summary
router.get('/:workspaceId', dashboardController.getStats);

// GET /api/dashboard/:workspaceId/prs - Get all team PR reviews
router.get('/:workspaceId/prs', dashboardController.getAllPRs);

// POST /api/dashboard/:workspaceId/report - Generate release readiness report
router.post('/:workspaceId/report', dashboardController.generateReport);

// GET /api/dashboard/:workspaceId/reports - List past reports
router.get('/:workspaceId/reports', dashboardController.getReports);

// GET /api/dashboard/:workspaceId/reports/:reportId - Get one report
router.get('/:workspaceId/reports/:reportId', dashboardController.getReport);

// DELETE /api/dashboard/:workspaceId/reports/:reportId - Delete one report
router.delete('/:workspaceId/reports/:reportId', dashboardController.deleteReport);

// POST /api/dashboard/:workspaceId/reviews/:reviewId/decision - Approve or reject review (owner/admin only)
router.post('/:workspaceId/reviews/:reviewId/decision', dashboardController.makeDecision);

export default router;