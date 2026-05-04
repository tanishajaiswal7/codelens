import { dashboardService } from '../services/dashboardService.js';
import { releaseReportService } from '../services/releaseReportService.js';
import { ReleaseReport } from '../../review-service/models/ReleaseReport.js';
import { WorkspaceMember } from '../../workspace-service/models/WorkspaceMember.js';

export const dashboardController = {
  async getStats(req, res) {
    try {
      const { workspaceId } = req.params;
      const requestingUserId = req.userId;

      const stats = await dashboardService.getWorkspaceStats(workspaceId, requestingUserId);

      // Get user role for frontend
      const member = await WorkspaceMember.findOne({
        workspaceId,
        userId: requestingUserId
      });

      res.json({
        message: 'Dashboard stats retrieved',
        stats,
        userRole: member?.role || null,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error.message);
      const status = error.message.includes('Forbidden') ? 403 : 500;
      res.status(status).json({
        message: 'Failed to retrieve dashboard stats',
        error: error.message,
      });
    }
  },

  async getAllPRs(req, res) {
    try {
      const { workspaceId } = req.params;
      const requestingUserId = req.userId;

      const prs = await dashboardService.getAllPRs(workspaceId, requestingUserId);

      res.json({
        message: 'PR reviews retrieved',
        prs,
      });
    } catch (error) {
      console.error('Get all PRs error:', error.message);
      const status = error.message.includes('Forbidden') ? 403 : 500;
      res.status(status).json({
        message: 'Failed to retrieve PR reviews',
        error: error.message,
      });
    }
  },

  async generateReport(req, res) {
    try {
      const { workspaceId } = req.params;
      const { sprintName } = req.body;
      const requestingUserId = req.userId;

      if (!sprintName || typeof sprintName !== 'string') {
        return res.status(400).json({
          message: 'sprintName is required and must be a string',
        });
      }

      const report = await dashboardService.generateReleaseReport(workspaceId, requestingUserId, sprintName);

      res.json({
        message: 'Release report generated',
        report,
      });
    } catch (error) {
      console.error('Generate report error:', error.message);
      const status = error.message.includes('Forbidden') ? 403 : 500;
      res.status(status).json({
        message: 'Failed to generate release report',
        error: error.message,
      });
    }
  },

  async getReports(req, res) {
    try {
      const { workspaceId } = req.params;
      const requestingUserId = req.userId;

      // Verify access
      const member = await WorkspaceMember.findOne({
        workspaceId,
        userId: requestingUserId,
        role: { $in: ['owner', 'admin'] },
        isActive: true,
      });
      if (!member) {
        return res.status(403).json({
          message: 'Forbidden: Only workspace owners and admins can access reports',
        });
      }

      const reports = await ReleaseReport.find({ workspaceId }).sort({ createdAt: -1 });

      res.json({
        message: 'Release reports retrieved',
        reports: reports.map(r => ({
          id: r._id,
          sprintName: r.sprintName,
          verdict: r.verdict,
          summary: r.executiveSummary,
          executiveSummary: r.executiveSummary,
          qualityScore: r.qualityScore,
          totalReviews: r.totalReviews,
          blockerCount: r.blockers?.length || 0,
          warningCount: r.risks?.length || 0,
          blockers: r.blockers || [],
          warnings: r.risks || [],
          recommendations: r.recommendations,
          createdAt: r.createdAt,
        })),
      });
    } catch (error) {
      console.error('Get reports error:', error.message);
      res.status(500).json({
        message: 'Failed to retrieve reports',
        error: error.message,
      });
    }
  },

  async getReport(req, res) {
    try {
      const { workspaceId, reportId } = req.params;
      const requestingUserId = req.userId;

      // Verify access
      const member = await WorkspaceMember.findOne({
        workspaceId,
        userId: requestingUserId,
        role: { $in: ['owner', 'admin'] },
        isActive: true,
      });
      if (!member) {
        return res.status(403).json({
          message: 'Forbidden: Only workspace owners and admins can access reports',
        });
      }

      const report = await ReleaseReport.findOne({ _id: reportId, workspaceId });
      if (!report) {
        return res.status(404).json({
          message: 'Report not found',
        });
      }

      res.json({
        message: 'Report retrieved',
        report: {
          id: report._id,
          sprintName: report.sprintName,
          verdict: report.verdict,
          executiveSummary: report.executiveSummary,
          blockers: report.blockers,
          risks: report.risks,
          recommendations: report.recommendations,
          approvedPRCount: report.approvedPRCount,
          flaggedPRCount: report.flaggedPRCount,
          createdAt: report.createdAt,
        },
      });
    } catch (error) {
      console.error('Get report error:', error.message);
      res.status(500).json({
        message: 'Failed to retrieve report',
        error: error.message,
      });
    }
  },

  async makeDecision(req, res, next) {
    try {
      const { workspaceId, reviewId } = req.params;
      const { decision, feedback } = req.body;
      const managerId = req.userId;

      // Verify manager role
      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId: managerId,
        role: { $in: ['owner', 'admin'] },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Only owners/admins can make decisions' });
      }

      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ error: 'Decision must be approved or rejected' });
      }

      // Update the review
      const { Review } = await import('../../review-service/models/Review.js');

      const review = await Review.findByIdAndUpdate(
        reviewId,
        {
          managerDecision: decision,
          managerFeedback: feedback || null,
          managerDecisionAt: new Date(),
          managerDecisionBy: managerId,
        },
        { new: true }
      );

      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }

      // Publish notification event through RabbitMQ
      const { publishEvent } = await import(
        '../../../rabbitmq/publisher.js'
      );
      const { QUEUES } = await import('../../../rabbitmq/queues.js');

      await publishEvent(QUEUES.NOTIFICATION_EVENTS, {
        type: 'manager_decision',
        workspaceId,
        targetUserId: review.userId.toString(),
        reviewId: review._id.toString(),
        decision,
        feedback: feedback || null,
        prNumber: review.prNumber,
        managerId,
      });

      res.json({ success: true, decision, feedback });
    } catch (err) {
      next(err);
    }
  },
};