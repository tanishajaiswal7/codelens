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
      const { persona = 'security' } = req.body;

      // Fetch PR files
      const files = await workspacePRService.getPRFilesWithContent(
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
      const workspace = await Workspace.findById(workspaceId).lean();

      // Queue the review job
      const jobId = uuidv4();
      await jobService.createJob(jobId, req.userId, 'review');
      await publishToQueue(QUEUES.REVIEW_JOBS, {
        jobId,
        userId: req.userId,
        type: 'review',
        code: combinedCode,
        persona,
        mode: 'standard',
        workspaceId,
        repoFullName: workspace.repoFullName,
        prNumber: parseInt(prNumber),
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