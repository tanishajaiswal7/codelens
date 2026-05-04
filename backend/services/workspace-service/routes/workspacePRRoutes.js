import express from 'express';
import { authMiddleware } from '../../../middleware/authMiddleware.js';
import { workspacePRController } from '../controllers/workspacePRController.js';

const router = express.Router();

// Get open PRs for workspace linked repo
router.get('/:workspaceId/pulls', authMiddleware, workspacePRController.getOpenPRs);

// Review a specific PR (manager triggers this)
router.post('/:workspaceId/pulls/:prNumber/review', authMiddleware, workspacePRController.reviewPR);

// Delete a PR from the workspace dashboard (workspace creator only)
router.delete('/:workspaceId/pulls/:prNumber', authMiddleware, workspacePRController.deletePR);

export default router;