import crypto from 'crypto';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { WorkspaceInvite } from '../models/WorkspaceInvite.js';
import { Review } from '../../review-service/models/Review.js';
import { User } from '../../auth-service/models/User.js';
import { emailService } from '../../auth-service/services/emailService.js';
import { publishEvent } from '../../../rabbitmq/publisher.js';
import { QUEUES } from '../../../rabbitmq/queues.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const INVITE_EXPIRY_DAYS = 7;

const buildInviteUrl = (baseUrl, token) => {
  const root = (baseUrl || FRONTEND_URL).replace(/\/+$/, '');
  return `${root}/join/${token}`;
};

const normalizeRepoUrl = (repoUrl) => {
  if (!repoUrl) return { repoUrl: null, repoFullName: null };

  const trimmed = repoUrl
    .replace('https://github.com/', '')
    .replace('http://github.com/', '')
    .replace(/\/$/, '')
    .trim();

  return {
    repoUrl: repoUrl.trim(),
    repoFullName: trimmed || null,
  };
};

const findActiveReusableInvite = async (workspaceId) => {
  const now = new Date();
  return WorkspaceInvite.findOne({
    workspaceId,
    isReusable: true,
    expiresAt: { $gte: now },
  }).sort({ createdAt: -1 });
};

const ensureInviteAccess = async (workspaceId, userId) => {
  const inviter = await WorkspaceMember.findOne({
    workspaceId,
    userId,
    isActive: true,
  });

  if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
    throw new Error('Access denied: only owner or admin can invite members');
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  return workspace;
};

export const workspaceService = {
  async createWorkspace(userId, name, repoUrl = null) {
    if (!name || name.trim().length < 2) {
      throw new Error('Workspace name must be at least 2 characters');
    }

    const repoInfo = normalizeRepoUrl(repoUrl);

    const workspace = await Workspace.create({
      name: name.trim(),
      ownerId: userId,
      plan: 'free',
      isActive: true,
      repoUrl: repoInfo.repoUrl,
      repoFullName: repoInfo.repoFullName,
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId,
      role: 'owner',
      isActive: true,
    });

    return workspace;
  },

  async updateWorkspaceRepo(workspaceId, userId, repoUrl) {
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId,
      role: { $in: ['owner', 'admin'] },
      isActive: true,
    });

    if (!membership) {
      const error = new Error('Only owners can update repo');
      error.status = 403;
      throw error;
    }

    const repoInfo = normalizeRepoUrl(repoUrl);
    if (!repoInfo.repoFullName) {
      const error = new Error('Valid repoUrl is required');
      error.status = 400;
      throw error;
    }

    await Workspace.findByIdAndUpdate(workspaceId, {
      repoUrl: repoInfo.repoUrl,
      repoFullName: repoInfo.repoFullName,
    });

    return repoInfo;
  },

  async getUserWorkspaces(userId) {
    const memberships = await WorkspaceMember.find({
      userId,
      isActive: true,
    }).populate('workspaceId');

    return memberships.map((m) => ({
      workspace: m.workspaceId,
      role: m.role,
    }));
  },

  async getWorkspaceDetail(workspaceId, requestingUserId) {
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      isActive: true,
    });

    if (!member) {
      throw new Error('Access denied: not a member of this workspace');
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const memberCount = await WorkspaceMember.countDocuments({
      workspaceId,
      isActive: true,
    });

    return {
      workspace,
      memberCount,
      requestingUserRole: member.role,
    };
  },

  async generateInvite(workspaceId, inviterUserId, email, frontendBaseUrl) {
    const inviter = await WorkspaceMember.findOne({
      workspaceId,
      userId: inviterUserId,
      isActive: true,
    });

    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
      throw new Error('Access denied: only owner or admin can invite members');
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (!email || !email.trim()) {
      throw new Error('Valid email is required');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    await WorkspaceInvite.create({
      workspaceId,
      email: email.toLowerCase(),
      token,
      expiresAt,
      isReusable: false,
      maxUses: 1,
    });

    const inviteUrl = buildInviteUrl(frontendBaseUrl, token);
    let emailSent = false;

    if (emailService.isConfigured()) {
      try {
        const inviterUser = await User.findById(inviterUserId).select('name email').lean();
        await emailService.sendWorkspaceInviteEmail({
          toEmail: email.toLowerCase(),
          workspaceName: workspace.name,
          inviteUrl,
          inviterName: inviterUser?.name || inviterUser?.email || 'A teammate',
        });
        emailSent = true;
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Workspace invite email failed:', err.message);
        }
      }
    }

    return {
      inviteUrl,
      token,
      emailSent,
    };
  },

  async generateReusableInvite(workspaceId, inviterUserId, frontendBaseUrl) {
    await ensureInviteAccess(workspaceId, inviterUserId);

    const existingInvite = await findActiveReusableInvite(workspaceId);
    if (existingInvite) {
      return {
        inviteUrl: buildInviteUrl(frontendBaseUrl, existingInvite.token),
        token: existingInvite.token,
        expiresAt: existingInvite.expiresAt,
        reused: true,
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    await WorkspaceInvite.create({
      workspaceId,
      token,
      expiresAt,
      isReusable: true,
      maxUses: 0,
    });

    return {
      inviteUrl: buildInviteUrl(frontendBaseUrl, token),
      token,
      expiresAt,
      reused: false,
    };
  },

  async getReusableInviteLink(workspaceId, requestingUserId, frontendBaseUrl) {
    await ensureInviteAccess(workspaceId, requestingUserId);

    const existingInvite = await findActiveReusableInvite(workspaceId);
    if (!existingInvite) {
      return {
        inviteUrl: null,
        token: null,
        expiresAt: null,
      };
    }

    return {
      inviteUrl: buildInviteUrl(frontendBaseUrl, existingInvite.token),
      token: existingInvite.token,
      expiresAt: existingInvite.expiresAt,
    };
  },

  async acceptInvite(token, userId) {
    const invite = await WorkspaceInvite.findOne({ token });

    if (!invite) {
      throw new Error('Invite link not found');
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invite link expired');
    }

    if (!invite.isReusable && invite.usedAt) {
      throw new Error('Invite already used');
    }

    if (invite.isReusable && invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      throw new Error('Invite link usage limit reached');
    }

    // Check if user is already a member
    const existingMember = await WorkspaceMember.findOne({
      workspaceId: invite.workspaceId,
      userId,
    });

    if (existingMember) {
      // Already a member
      const workspace = await Workspace.findById(invite.workspaceId);
      return workspace;
    }

    // Create new member
    await WorkspaceMember.create({
      workspaceId: invite.workspaceId,
      userId,
      role: 'member',
      isActive: true,
    });

    const joinedUser = await User.findById(userId).select('name email').lean();

    if (invite.isReusable) {
      invite.uses += 1;
    } else {
      invite.usedAt = new Date();
    }

    await invite.save();

    const workspace = await Workspace.findById(invite.workspaceId);

    await publishEvent(QUEUES.NOTIFICATION_EVENTS, {
      type: 'member_joined',
      workspaceId: invite.workspaceId,
      joinedUserId: userId,
      joinedUserName: joinedUser?.name || joinedUser?.email || 'A new member',
      workspaceName: workspace?.name || null,
      createdAt: new Date().toISOString(),
    });

    return workspace;
  },

  async getMembers(workspaceId, requestingUserId) {
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      isActive: true,
    });

    if (!member) {
      throw new Error('Access denied: not a member of this workspace');
    }

    const members = await WorkspaceMember.find({
      workspaceId,
      isActive: true,
    }).populate('userId', 'name email githubUsername githubAvatar');

    // Enrich with review counts and latest review details
    const enrichedMembers = await Promise.all(
      members.map(async (m) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const reviewCount = await Review.countDocuments({
          userId: m.userId._id,
          createdAt: { $gte: thirtyDaysAgo },
          deleted: false,
        });

        // Get latest review with verdict and issue counts
        const latestReview = await Review.findOne({
          userId: m.userId._id,
          deleted: false,
        })
          .sort({ createdAt: -1 })
          .select('verdict suggestions createdAt summary')
          .lean();

        let issueCount = 0;
        let criticalCount = 0;
        if (latestReview?.suggestions) {
          issueCount = latestReview.suggestions.length;
          criticalCount = latestReview.suggestions.filter(
            (s) => s.severity === 'critical'
          ).length;
        }

        return {
          _id: m._id,
          userId: m.userId._id,
          name: m.userId.name,
          email: m.userId.email,
          githubUsername: m.userId.githubUsername,
          githubAvatar: m.userId.githubAvatar,
          role: m.role,
          reviewsThisMonth: reviewCount,
          latestReview: latestReview
            ? {
                verdict: latestReview.verdict,
                summary: latestReview.summary,
                issueCount,
                criticalCount,
                createdAt: latestReview.createdAt,
              }
            : null,
          joinedAt: m.createdAt,
        };
      })
    );

    return enrichedMembers;
  },

  async getPendingInvites(workspaceId, requestingUserId) {
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      isActive: true,
    });

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Access denied: only owner or admin can view pending invites');
    }

    const now = new Date();
    const pendingInvites = await WorkspaceInvite.find({
      workspaceId,
      expiresAt: { $gte: now },
      $or: [
        { isReusable: false, usedAt: null },
        { isReusable: true, maxUses: 0 },
        { isReusable: true, maxUses: { $gt: 0 }, $expr: { $lt: ['$uses', '$maxUses'] } },
      ],
    }).sort({ createdAt: -1 });

    return pendingInvites.map((invite) => ({
      _id: invite._id,
      email: invite.email,
      token: invite.token,
      expiresAt: invite.expiresAt,
      isReusable: invite.isReusable,
      maxUses: invite.maxUses,
      uses: invite.uses || 0,
      createdAt: invite.createdAt,
    }));
  },

  async deleteReusableInvite(workspaceId, requestingUserId) {
    await ensureInviteAccess(workspaceId, requestingUserId);

    const invite = await WorkspaceInvite.findOne({
      workspaceId,
      isReusable: true,
      expiresAt: { $gte: new Date() },
    }).sort({ createdAt: -1 });

    if (!invite) {
      const error = new Error('Invite link not found');
      error.status = 404;
      throw error;
    }

    await invite.deleteOne();
    return { message: 'Reusable invite link deleted successfully' };
  },

  async deletePendingInvite(workspaceId, requestingUserId, inviteId) {
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      isActive: true,
    });

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Access denied: only owner or admin can delete invites');
    }

    const invite = await WorkspaceInvite.findOne({
      _id: inviteId,
      workspaceId,
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.usedAt) {
      throw new Error('Cannot delete an invite that has already been used');
    }

    await invite.deleteOne();
    return { message: 'Pending invite deleted successfully' };
  },

  async leaveWorkspace(workspaceId, userId) {
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId,
      isActive: true,
    });

    if (!member) {
      throw new Error('Not a member of this workspace');
    }

    // Prevent owner from leaving if they are the only owner
    if (member.role === 'owner') {
      const ownerCount = await WorkspaceMember.countDocuments({
        workspaceId,
        role: 'owner',
        isActive: true,
      });

      if (ownerCount === 1) {
        throw new Error('Owner cannot leave workspace (at least one owner must remain)');
      }
    }

    member.isActive = false;
    await member.save();

    return { message: 'Successfully left workspace' };
  },

  async updateWorkspaceRepo(workspaceId, userId, repoUrl) {
    // Verify user is owner or admin
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId,
      role: { $in: ['owner', 'admin'] }
    });
    if (!membership) throw { status: 403, message: 'Only owners can update repo' };

    const repoFullName = repoUrl
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .replace(/\/$/, '')
      .trim();

    await Workspace.findByIdAndUpdate(workspaceId, {
      repoUrl,
      repoFullName
    });

    return { repoUrl, repoFullName };
  },
};
