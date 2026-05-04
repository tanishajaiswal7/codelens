import mongoose from 'mongoose';

const releaseReportSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sprintName: {
      type: String,
      required: true,
    },
    prReviewIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
    }],
    verdict: {
      type: String,
      enum: ['ready', 'not_ready', 'needs_review'],
      required: true,
    },
    executiveSummary: {
      type: String,
      required: true,
    },
    blockers: [{
      title: String,
      file: String,
      prNumber: String,
      severity: String,
      recommendation: String,
    }],
    risks: [{
      title: String,
      file: String,
      prNumber: String,
      severity: String,
      recommendation: String,
    }],
    recommendations: {
      type: String,
      required: true,
    },
    qualityScore: {
      type: Number,
      default: null,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    approvedPRCount: {
      type: Number,
      required: true,
    },
    flaggedPRCount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const ReleaseReport = mongoose.model('ReleaseReport', releaseReportSchema);