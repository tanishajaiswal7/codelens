import { Review } from '../../review-service/models/Review.js';
import { Workspace } from '../../workspace-service/models/Workspace.js';
import { WorkspaceMember } from '../../workspace-service/models/WorkspaceMember.js';
import { User } from '../../auth-service/models/User.js';
import { ReleaseReport } from '../../review-service/models/ReleaseReport.js';
import { decryptToken } from '../../github-auth-service/services/githubAuthService.js';
import mongoose from 'mongoose';

const fetchOpenPullRequestsCount = async (repoFullName, encryptedToken) => {
  if (!repoFullName || !encryptedToken) return 0;

  const token = decryptToken(encryptedToken);
  let page = 1;
  let total = 0;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=open&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch open PR count (${response.status})`);
    }

    const pulls = await response.json();
    if (!Array.isArray(pulls) || pulls.length === 0) break;

    total += pulls.length;
    if (pulls.length < 100) break;

    page += 1;
  }

  return total;
};

export const dashboardService = {
  async getWorkspaceStats(workspaceId, requestingUserId) {
    // Verify requester is owner or admin
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      role: { $in: ['owner', 'admin'] }
    });
    if (!member) throw { status: 403, message: 'Access denied' };

    const workspace = await Workspace.findById(workspaceId).lean();

    const requestingUser = await User.findById(requestingUserId)
      .select('githubToken')
      .lean();

    const members = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'name email avatarUrl githubAvatar githubUsername')
      .lean();

    // ONLY get reviews tagged with this workspaceId
    // Personal reviews (workspaceId: null) are NEVER included
    const reviews = await Review.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    })
    .sort({ createdAt: -1 })
    .lean();

    const totalReviews = reviews.length;
    const criticalCount = reviews.reduce((acc, r) =>
      acc + (r.suggestions?.filter(s => s.severity === 'critical').length || 0)
    , 0);
    const approvedCount = reviews.filter(r => r.verdict === 'approved').length;
    const qualityScore = totalReviews > 0
      ? Math.round((approvedCount / totalReviews) * 100)
      : 100;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reviewsThisWeek = reviews.filter(
      r => new Date(r.createdAt) > oneWeekAgo
    ).length;

    let openPrCount = 0;
    if (workspace?.repoFullName && requestingUser?.githubToken) {
      try {
        openPrCount = await fetchOpenPullRequestsCount(
          workspace.repoFullName,
          requestingUser.githubToken
        );
      } catch (error) {
        // Keep dashboard available even if GitHub count fetch fails.
        console.error('Open PR count fetch failed:', error.message);
      }
    }

    // Per member stats
    const memberStats = members.map(m => {
      const uid = m.userId._id.toString();
      const memberReviews = reviews.filter(
        r => r.userId.toString() === uid
      );
      const issueCounts = memberReviews.map((r) => r.suggestions?.length || 0);
      const averageIssues = issueCounts.length > 0
        ? Math.round(issueCounts.reduce((acc, value) => acc + value, 0) / issueCounts.length)
        : 0;
      const severityRank = { info: 1, low: 2, medium: 3, high: 4, critical: 5 };
      const worstSeverity = memberReviews.reduce((current, review) => {
        const reviewWorst = (review.suggestions || []).reduce((worst, suggestion) => {
          const severity = suggestion.severity || 'info';
          return severityRank[severity] > severityRank[worst] ? severity : worst;
        }, 'info');
        return severityRank[reviewWorst] > severityRank[current] ? reviewWorst : current;
      }, 'info');

      return {
        userId: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        role: m.role,
        totalReviews: memberReviews.length,
        criticalIssues: memberReviews.reduce((acc, r) =>
          acc + (r.suggestions?.filter(s => s.severity === 'critical').length || 0)
        , 0),
        lastReviewAt: memberReviews[0]?.createdAt || null,
        latestVerdict: memberReviews[0]?.verdict || null
        ,
        avatar: m.userId.avatarUrl || m.userId.githubAvatar || null,
        prCount: memberReviews.length,
        avgSuggestions: averageIssues,
        worstSeverity,
      };
    });

    // PR rows for table — NO code field ever
    const reviewRows = reviews.slice(0, 50).map(r => {
      const member = members.find(
        m => m.userId._id.toString() === r.userId.toString()
      );
      return {
        reviewId: r._id,
        prNumber: r.prNumber,
        title: r.prNumber
          ? `PR #${r.prNumber}`
          : (r.repoPath || 'Code review'),
        filePath: r.repoPath || null,
        repoFullName: r.repoFullName || workspace.repoFullName,
        authorName: member?.userId?.name || 'Unknown',
        issueCount: r.suggestions?.length || 0,
        criticalCount: r.suggestions?.filter(
          s => s.severity === 'critical'
        ).length || 0,
        highCount: r.suggestions?.filter(
          s => s.severity === 'high'
        ).length || 0,
        verdict: r.verdict || 'unknown',
        persona: r.persona,
        createdAt: r.createdAt
        // NO code or suggestions detail — manager sees metadata only
      };
    });

    return {
      workspaceName: workspace.name,
      repoFullName: workspace.repoFullName || null,
      repoUrl: workspace.repoUrl || null,
      totalOpenPRs: openPrCount,
      reviewedPrCount: totalReviews,
      criticalCount,
      qualityScore,
      prsThisWeek: reviewsThisWeek,
      memberStats,
      reviewRows
    };
  },

  async getAllPRs(workspaceId, requestingUserId) {
    // Verify requester is owner or admin
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      role: { $in: ['owner', 'admin'] },
      isActive: true,
    });
    if (!member) {
      throw new Error('Forbidden: Only workspace owners and admins can access dashboard');
    }

    // Get all active member userIds
    const members = await WorkspaceMember.find({
      workspaceId,
      isActive: true,
    }).select('userId');

    const memberUserIds = members.map(m => m.userId);

    // Get all PR reviews
    const prReviews = await Review.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      source: 'github_pr',
      deleted: { $ne: true },
    }).populate('userId', 'name avatarUrl githubAvatar githubUsername').sort({ createdAt: -1 }).lean();

    return prReviews.map(pr => {
      const criticalCount = pr.suggestions?.filter(s => s.severity === 'critical').length || 0;
      const totalIssues = pr.suggestions?.length || 0;
      return {
        id: pr._id,
        prNumber: pr.prNumber || 'N/A',
        prTitle: pr.prTitle || pr.repoPath || `PR #${pr.prNumber || ''}`,
        repoFullName: pr.repoFullName,
        authorName: pr.userId?.name || 'Unknown',
        authorAvatar: pr.userId?.avatarUrl || pr.userId?.githubAvatar,
        createdAt: pr.createdAt,
        verdict: pr.verdict,
        suggestions: pr.suggestions || [],
        criticalCount,
        totalIssues,
      };
    });
  },

  async generateReleaseReport(workspaceId, requestingUserId, sprintName) {
    // Verify owner or admin
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      role: { $in: ['owner', 'admin'] }
    });
    if (!member) throw { status: 403, message: 'Access denied' };

    const stats = await this.getWorkspaceStats(workspaceId, requestingUserId);

    const blockers = stats.reviewRows.filter(
      r => r.criticalCount > 0 || r.verdict === 'needs_revision'
    );
    const warnings = stats.reviewRows.filter(
      r => r.highCount > 0 || r.verdict === 'minor_issues'
    );
    const approved = stats.reviewRows.filter(
      r => r.verdict === 'approved'
    );

    const isReady = blockers.length === 0 && warnings.length === 0;
    const verdict = isReady ? 'ready' : 'not_ready';
    const reportSummary = isReady
      ? `All ${stats.reviewedPrCount} reviewed pull requests are in good shape. The sprint is ready to ship.`
      : `${blockers.length} PR(s) have blocking issues and ${warnings.length} additional PR(s) need attention before release.`;
    const recommendations = isReady
      ? 'Proceed with the release, merge approved pull requests, and keep monitoring the next sprint.'
      : 'Resolve all blockers first, then revisit warnings and re-run reviews before merging.';
    const prReviewIds = stats.reviewRows.map((review) => review.reviewId);

    const report = {
      sprintName: sprintName || 'Sprint',
      workspaceId,
      repoFullName: stats.repoFullName,
      generatedAt: new Date(),
      isReady,
      verdict,
      executiveSummary: reportSummary,
      qualityScore: stats.qualityScore,
      totalReviews: stats.reviewedPrCount,
      approvedCount: approved.length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      blockers: blockers.map(r => ({
        title: r.title,
        file: r.filePath || r.repoFullName || 'Unknown file',
        prNumber: r.prNumber ? `#${r.prNumber}` : 'N/A',
        severity: 'critical',
        recommendation: 'Fix the blocking issue before merging.',
      })),
      warnings: warnings.map(r => ({
        title: r.title,
        file: r.filePath || r.repoFullName || 'Unknown file',
        prNumber: r.prNumber ? `#${r.prNumber}` : 'N/A',
        severity: 'high',
        recommendation: 'Address this issue before the release goes out.',
      })),
      memberBreakdown: stats.memberStats,
      recommendations,
      approvedPRCount: approved.length,
      flaggedPRCount: blockers.length + warnings.length,
    };

    // Save to MongoDB
    await ReleaseReport.create({
      workspaceId,
      generatedBy: requestingUserId,
      sprintName: report.sprintName,
      prReviewIds,
      verdict: report.verdict,
      executiveSummary: report.executiveSummary,
      blockers: report.blockers,
      risks: report.warnings,
      recommendations: report.recommendations,
      approvedPRCount: report.approvedPRCount,
      flaggedPRCount: report.flaggedPRCount,
    });

    return report;
  },
};