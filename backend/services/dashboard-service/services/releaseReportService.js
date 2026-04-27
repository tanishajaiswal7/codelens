import { Review } from '../../review-service/models/Review.js';
import { ReleaseReport } from '../../review-service/models/ReleaseReport.js';
import { WorkspaceMember } from '../../workspace-service/models/WorkspaceMember.js';
import { reviewService } from '../../review-service/services/reviewService.js';

export const releaseReportService = {
  async generate(workspaceId, generatedBy, prReviewIds, sprintName) {
    // Verify user is owner or admin
    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: generatedBy,
      role: { $in: ['owner', 'admin'] },
      isActive: true,
    });
    if (!member) {
      throw new Error('Forbidden: Only workspace owners and admins can generate release reports');
    }

    // Fetch all PRReview documents
    const prReviews = await Review.find({
      _id: { $in: prReviewIds },
      source: 'github_pr',
      deleted: { $ne: true },
    }).populate('userId', 'name');

    if (prReviews.length === 0) {
      throw new Error('No valid PR reviews found');
    }

    // Extract all suggestions
    const allSuggestions = [];
    prReviews.forEach(pr => {
      pr.suggestions.forEach(suggestion => {
        allSuggestions.push({
          ...suggestion.toObject(),
          prNumber: pr.prNumber,
          prTitle: pr.prTitle,
          repoFullName: pr.repoFullName,
          authorName: pr.userId.name,
        });
      });
    });

    // Group blockers and risks
    const blockers = allSuggestions.filter(s => s.severity === 'critical').map(s => ({
      title: s.title,
      file: s.lineRef || 'N/A',
      prNumber: s.prNumber,
      severity: s.severity,
      recommendation: s.description,
    }));

    const risks = allSuggestions.filter(s => s.severity === 'high').map(s => ({
      title: s.title,
      file: s.lineRef || 'N/A',
      prNumber: s.prNumber,
      severity: s.severity,
      recommendation: s.description,
    }));

    // Build AI system prompt
    const systemPrompt = `You are an Engineering Release Manager reviewing AI code analysis results.
Assess if this release is safe to ship. Use NON-TECHNICAL language for the executive summary.
Return ONLY valid JSON:
{ verdict: 'ready'|'not_ready'|'needs_review',
  executiveSummary: string (2-3 sentences, non-technical),
  blockers: [{title, file, prNumber, severity, recommendation}],
  risks: [{title, file, prNumber, severity, recommendation}],
  recommendations: string,
  approvedPRCount: number, flaggedPRCount: number }`;

    // Build user message: suggestions grouped by PR
    let userMessage = 'Code Analysis Results for Release Review:\n\n';
    const prGroups = {};
    allSuggestions.forEach(s => {
      if (!prGroups[s.prNumber]) {
        prGroups[s.prNumber] = {
          title: s.prTitle,
          repo: s.repoFullName,
          author: s.authorName,
          suggestions: [],
        };
      }
      prGroups[s.prNumber].suggestions.push(s);
    });

    Object.keys(prGroups).forEach(prNum => {
      const pr = prGroups[prNum];
      userMessage += `PR #${prNum}: ${pr.title} (Repo: ${pr.repo}, Author: ${pr.author})\n`;
      pr.suggestions.forEach(s => {
        userMessage += `  - ${s.severity.toUpperCase()}: ${s.title} - ${s.description}\n`;
      });
      userMessage += '\n';
    });

    // Call AI
    const aiResponse = await reviewService.callGroqAPI(systemPrompt, userMessage);

    // Parse JSON response
    let parsed;
    try {
      // Strip markdown fences if present
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (error) {
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate required fields
    if (!parsed.verdict || !['ready', 'not_ready', 'needs_review'].includes(parsed.verdict)) {
      throw new Error('Invalid verdict in AI response');
    }

    // Calculate approved and flagged counts
    const approvedPRCount = prReviews.filter(pr => pr.verdict === 'approved').length;
    const flaggedPRCount = prReviews.filter(pr => pr.verdict !== 'approved').length;

    // Override with AI if provided, else use calculated
    const finalApprovedPRCount = parsed.approvedPRCount !== undefined ? parsed.approvedPRCount : approvedPRCount;
    const finalFlaggedPRCount = parsed.flaggedPRCount !== undefined ? parsed.flaggedPRCount : flaggedPRCount;

    // Save ReleaseReport
    const report = await ReleaseReport.create({
      workspaceId,
      generatedBy,
      sprintName,
      prReviewIds,
      verdict: parsed.verdict,
      executiveSummary: parsed.executiveSummary || '',
      blockers: parsed.blockers || blockers,
      risks: parsed.risks || risks,
      recommendations: parsed.recommendations || '',
      approvedPRCount: finalApprovedPRCount,
      flaggedPRCount: finalFlaggedPRCount,
    });

    return {
      id: report._id,
      verdict: report.verdict,
      executiveSummary: report.executiveSummary,
      blockers: report.blockers,
      risks: report.risks,
      recommendations: report.recommendations,
      approvedPRCount: report.approvedPRCount,
      flaggedPRCount: report.flaggedPRCount,
      createdAt: report.createdAt,
    };
  },
};