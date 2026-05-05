import express from 'express';
import { body } from 'express-validator';
import { workspaceController } from '../controllers/workspaceController.js';
import { optionalVerifyToken, verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/workspace — create workspace (protected)
router.post(
  '/',
  verifyToken,
  [body('name').trim().notEmpty().withMessage('Workspace name is required')],
  workspaceController.createWorkspace
);

// GET /api/workspace — get user's workspaces (protected)
router.get('/', verifyToken, workspaceController.getMyWorkspaces);

// GET /api/workspace/join/:token — accept invite (public, but uses auth if available)
router.get('/join/:token', optionalVerifyToken, workspaceController.acceptInvite);

// GET /api/workspace/:id — get workspace detail (protected)
router.get('/:id', verifyToken, workspaceController.getWorkspaceDetail);

// POST /api/workspace/:id/invite — invite member (protected)
router.post(
  '/:id/invite',
  verifyToken,
  [body('email').isEmail().withMessage('Valid email is required')],
  workspaceController.inviteMember
);

// POST /api/workspace/:id/invite-link — generate reusable workspace join link
router.post('/:id/invite-link', verifyToken, workspaceController.generateInviteLink);

// GET /api/workspace/:id/invite-link — fetch the current reusable workspace join link if one exists
router.get('/:id/invite-link', verifyToken, workspaceController.getInviteLink);

// GET /api/workspace/:id/pending-invites — fetch pending invites for the workspace (owner/admin only)
router.get('/:id/pending-invites', verifyToken, workspaceController.getPendingInvites);

// DELETE /api/workspace/:id/invite-link — remove the current reusable workspace link
router.delete('/:id/invite-link', verifyToken, workspaceController.deleteInviteLink);
router.post('/:id/invite-link/delete', verifyToken, workspaceController.deleteInviteLink);

// DELETE /api/workspace/:id/pending-invites/:inviteId — remove a single pending invite
router.delete('/:id/pending-invites/:inviteId', verifyToken, workspaceController.deletePendingInvite);
router.post('/:id/pending-invites/:inviteId/delete', verifyToken, workspaceController.deletePendingInvite);
router.delete('/:workspaceId/invites/:inviteId', verifyToken, workspaceController.deleteInvite);

// DELETE /api/workspace/:workspaceId — delete workspace (owner only)
router.delete('/:workspaceId', verifyToken, workspaceController.deleteWorkspace);

// PATCH /api/workspace/:id/repo — update workspace repo link (owner/admin only)
router.patch('/:id/repo', verifyToken, workspaceController.updateWorkspaceRepo);

// DELETE /api/workspace/:id/leave — leave workspace (protected)
router.delete('/:id/leave', verifyToken, workspaceController.leaveWorkspace);
router.delete('/:workspaceId/leave', verifyToken, workspaceController.leaveWorkspace);

// GET /api/workspace/:id/my-reviews — get current user's PR reviews (protected)
router.get('/:id/my-reviews', verifyToken, workspaceController.getMyReviews);

// GET /api/workspace/:id/reviewed-prs — list reviewed PRs for report generation (owner/admin)
router.get('/:id/reviewed-prs', verifyToken, workspaceController.getReviewedPRs);

// GET /api/workspace/:id/members — list members (protected)
router.get('/:id/members', verifyToken, workspaceController.getMembers);

export default router;
