import { workspaceService } from '../services/workspaceService.js';
import { WorkspaceInvite } from '../models/WorkspaceInvite.js';

export const workspaceController = {
  async createWorkspace(req, res, next) {
    try {
      const userId = req.userId;
      const { name, repoUrl } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }

      const workspace = await workspaceService.createWorkspace(userId, name, repoUrl);

      return res.status(201).json({
        message: 'Workspace created successfully',
        workspace,
      });
    } catch (error) {
      return next(error);
    }
  },

  async getMyWorkspaces(req, res, next) {
    try {
      const userId = req.userId;
      const workspaces = await workspaceService.getUserWorkspaces(userId);

      return res.json({
        workspaces,
      });
    } catch (error) {
      return next(error);
    }
  },

  async getWorkspaceDetail(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const detail = await workspaceService.getWorkspaceDetail(id, userId);

      return res.json(detail);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async inviteMember(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { email } = req.body;
      const frontendBaseUrl = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';

      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await workspaceService.generateInvite(id, userId, email, frontendBaseUrl);

      return res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async generateInviteLink(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const frontendBaseUrl = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';

      const result = await workspaceService.generateReusableInvite(id, userId, frontendBaseUrl);
      return res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async getInviteLink(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const frontendBaseUrl = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';

      const result = await workspaceService.getReusableInviteLink(id, userId, frontendBaseUrl);
      return res.json(result);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async deleteInviteLink(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const result = await workspaceService.deleteReusableInvite(id, userId);
      return res.json(result);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (/invite link not found/i.test(error.message) || /not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async deletePendingInvite(req, res, next) {
    try {
      const userId = req.userId;
      const { id, inviteId } = req.params;

      const result = await workspaceService.deletePendingInvite(id, userId, inviteId);
      return res.json(result);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (/invite not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      if (/Cannot delete an invite/i.test(error.message)) {
        return res.status(400).json({ error: error.message });
      }
      return next(error);
    }
  },

  async getPendingInvites(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const result = await workspaceService.getPendingInvites(id, userId);
      return res.json(result);
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async acceptInvite(req, res, next) {
    try {
      const { token } = req.params;
      const userId = req.userId;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      if (!userId) {
        // User not logged in — return invite details so frontend can redirect to login
        const invite = await WorkspaceInvite.findOne({ token }).populate('workspaceId');

        if (!invite) {
          return res.status(404).json({ error: 'Invite link not found' });
        }

        if (invite.expiresAt < new Date()) {
          return res.status(410).json({ error: 'Invite link expired' });
        }

        if (invite.usedAt) {
          return res.status(400).json({ error: 'Invite already used' });
        }

        return res.json({
          message: 'Please log in to accept this invite',
          token,
          workspaceName: invite.workspaceId.name,
        });
      }

      const workspace = await workspaceService.acceptInvite(token, userId);

      return res.json({
        message: 'Invite accepted successfully',
        workspace,
      });
    } catch (error) {
      if (error.message.includes('expired')) {
        return res.status(410).json({ error: error.message });
      }
      if (error.message.includes('already used')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async leaveWorkspace(req, res, next) {
    try {
      const userId = req.userId;
      const { id, workspaceId } = req.params;
      const targetWorkspaceId = workspaceId || id;

      const result = await workspaceService.leaveWorkspace(targetWorkspaceId, userId);

      return res.json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async deleteInvite(req, res, next) {
    try {
      const userId = req.userId;
      const { id, workspaceId, inviteId } = req.params;
      const targetWorkspaceId = workspaceId || id;

      const result = await workspaceService.deleteInvite(targetWorkspaceId, inviteId, userId);
      return res.json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (/invite not found/i.test(error.message)) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async getMembers(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const members = await workspaceService.getMembers(id, userId);

      return res.json({
        members,
      });
    } catch (error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return next(error);
    }
  },

  async updateWorkspaceRepo(req, res, next) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { repoUrl } = req.body;

      if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim().length === 0) {
        return res.status(400).json({ error: 'Valid repoUrl is required' });
      }

      const result = await workspaceService.updateWorkspaceRepo(id, userId, repoUrl.trim());

      return res.json({
        message: 'Workspace repo updated successfully',
        ...result,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return next(error);
    }
  },

  async getMyReviews(req, res, next) {
    try {
      const { id: workspaceId } = req.params;
      const userId = req.userId;

      // Verify user is a member
      const { WorkspaceMember } = await import('../models/WorkspaceMember.js');
      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId,
      });
      if (!membership) {
        return res.status(403).json({ error: 'Not a member' });
      }

      // Get only THIS user's reviews in this workspace
      const { Review } = await import('../../review-service/models/Review.js');

      const reviews = await Review.find({
        workspaceId,
        userId,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Return reviews with useful fields
      const formattedReviews = reviews.map((r) => ({
        _id: r._id,
        prNumber: r.prNumber || null,
        repoPath: r.repoPath || 'Code Review',
        verdict: r.verdict,
        managerDecision: r.managerDecision || null,
        managerFeedback: r.managerFeedback || null,
        criticalCount:
          r.suggestions?.filter((s) => s.severity === 'critical').length || 0,
        suggestions:
          r.suggestions?.map((s) => ({
            id: s.id,
            title: s.title,
            severity: s.severity,
            description: s.description,
            lineRef: s.lineRef,
          })) || [],
        createdAt: r.createdAt,
      }));

      res.json(formattedReviews);
    } catch (err) {
      next(err);
    }
  },
};
