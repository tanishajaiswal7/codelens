/**
 * GitHub File Browser Routes
 * Handles tree navigation, file content, and direct file reviews
 */

import express from 'express';
import { verifyToken } from '../../../middleware/authMiddleware.js';
import * as fileBrowserController from '../controllers/fileBrowserController.js';

const router = express.Router();

/**
 * GET /api/github/files/:owner/:repo/tree
 * Get folder/file tree contents
 * Query params: path (default: ""), ref (default: repo default branch)
 * Protected - requires JWT
 */
router.get(
  '/:owner/:repo/tree',
  verifyToken,
  fileBrowserController.getTree
);

/**
 * GET /api/github/files/:owner/:repo/content
 * Get file content (decoded from base64)
 * Query params: path (required), ref (default: main)
 * Protected - requires JWT
 */
router.get(
  '/:owner/:repo/content',
  verifyToken,
  fileBrowserController.getFileContent
);

/**
 * GET /api/github/files/:owner/:repo/branches
 * Get all branches for a repository
 * Protected - requires JWT
 */
router.get(
  '/:owner/:repo/branches',
  verifyToken,
  fileBrowserController.getBranches
);

/**
 * POST /api/github/files/review
 * Review a single file from the repository
 * Body: { owner, repo, path, ref, content, persona }
 * Protected - requires JWT + rate limiter
 */
router.post(
  '/review',
  verifyToken,
  fileBrowserController.reviewFile
);

export default router;
