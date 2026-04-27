import express from 'express';
import { verifyToken } from '../../../middleware/authMiddleware.js';
import * as githubPRController from '../controllers/githubPRController.js';

const router = express.Router();

/**
 * GET /api/github/pr/repos
 * Fetches user's GitHub repositories
 * Protected - requires JWT
 */
router.get('/repos', verifyToken, githubPRController.getRepos);

/**
 * GET /api/github/pr/repos/:owner/:repo/pulls
 * Fetches open pull requests for a repository
 * Protected - requires JWT
 */
router.get(
  '/repos/:owner/:repo/pulls',
  verifyToken,
  githubPRController.getPulls
);

/**
 * GET /api/github/pr/repos/:owner/:repo/pulls/:prNumber/files
 * Fetches files changed in a pull request
 * Protected - requires JWT
 */
router.get(
  '/repos/:owner/:repo/pulls/:prNumber/files',
  verifyToken,
  githubPRController.getPullFiles
);

/**
 * POST /api/github/pr/review
 * Generates AI review for selected PR files
 * Protected - requires JWT
 * Rate limited
 */
router.post('/review', verifyToken, githubPRController.reviewPR);

/**
 * GET /api/github/pr/history
 * Fetches PR review history
 * Protected - requires JWT
 */
router.get('/history', verifyToken, githubPRController.getHistory);

export default router;
