import { workspacePRService } from '../services/workspacePRService.js';
import { publishToQueue } from '../../../rabbitmq/publisher.js';
import { QUEUES } from '../../../rabbitmq/queues.js';
import { jobService } from '../../job-service/services/jobService.js';
import { v4 as uuidv4 } from 'uuid';

export const workspacePRController = {

  async getOpenPRs(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const result = await workspacePRService.getOpenPRs(
        workspaceId,
        req.userId
      );
      res.json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    }
  },

  async reviewPR(req, res, next) {
    try {
      const { workspaceId, prNumber } = req.params;
      const { persona = 'security', assignToMemberId = null } = req.body;

      // Fetch PR files + metadata
      const { files, prMeta } = await workspacePRService.getPRFilesWithContent(
        workspaceId,
        parseInt(prNumber),
        req.userId
      );

      // Combine files into one code block for AI
      const combinedCode = files
        .map(f => `=== FILE: ${f.path} ===\n${f.content}`)
        .join('\n\n');

      // Get workspace for repoFullName
      const { Workspace } = await import('../models/Workspace.js');
      const { WorkspaceMember } = await import('../models/WorkspaceMember.js');
      const { User } = await import('../../auth-service/models/User.js');
      const workspace = await Workspace.findById(workspaceId).lean();

      // Attribute review to assigned member, or fall back to PR author detection
      let reviewedForUserId = req.userId;

      if (assignToMemberId) {
        // If owner explicitly assigned this review to a member, use that
        const assignedMember = await WorkspaceMember.findOne({
          _id: assignToMemberId,
          workspaceId,
          isActive: true,
        })
          .select('userId')
          .lean();

        if (assignedMember) {
          reviewedForUserId = assignedMember.userId.toString();
        }
      } else if (prMeta?.authorLogin) {
        // Otherwise, try to match PR author to workspace member by GitHub username
        const prAuthor = await User.findOne({
          githubUsername: { $regex: `^${prMeta.authorLogin}$`, $options: 'i' },
        })
          .select('_id')
          .lean();

        if (prAuthor?._id) {
          const authorMembership = await WorkspaceMember.findOne({
            workspaceId,
            userId: prAuthor._id,
            isActive: true,
          })
            .select('_id')
            .lean();

          if (authorMembership) {
            reviewedForUserId = prAuthor._id.toString();
          }
        }
      }

      // Queue the review job
      const jobId = uuidv4();
      await jobService.createJob(jobId, req.userId, 'review');
      await publishToQueue(QUEUES.REVIEW_JOBS, {
        jobId,
        userId: reviewedForUserId,
        requestedByUserId: req.userId,
        type: 'review',
        code: combinedCode,
        persona,
        mode: 'standard',
        workspaceId,
        repoFullName: workspace.repoFullName,
        prNumber: parseInt(prNumber),
        prTitle: prMeta?.prTitle || null,
        repoPath: `PR #${prNumber}`,
        reviewContext: 'workspace'
      });

      res.status(202).json({
        jobId,
        status: 'queued',
        pollUrl: `/api/jobs/${jobId}`,
        filesQueued: files.map(f => f.path)
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    }
  },

  async deletePR(req, res, next) {
    try {
      const { workspaceId, prNumber } = req.params;
      const result = await workspacePRService.deletePR(workspaceId, prNumber, req.userId);
      res.json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    }
  }
};