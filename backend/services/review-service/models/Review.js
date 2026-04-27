import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  lineRef: String,
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
  },
  confidence: Number,
  confidenceReason: String,
  confidenceLabel: String,
  confidenceBand: String,
  category: String,
  status: {
    type: String,
    enum: ['still_present', 'new'],
    default: undefined,
  },
});

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    persona: {
      type: String,
      enum: ['faang', 'startup', 'security'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['standard', 'socratic'],
      default: 'standard',
    },
    summary: String,
    verdict: {
      type: String,
      enum: ['needs_revision', 'approved', 'minor_issues'],
    },
    suggestions: [suggestionSchema],
    deleted: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ['paste', 'github_file', 'github_pr'],
      default: 'paste',
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    prNumber: {
      type: Number,
      default: null,
    },
    prTitle: {
      type: String,
      default: null,
    },
    repoFullName: {
      type: String,
      default: null,
    },
    repoPath: {
      type: String,
      default: null,
    },
    repoRef: {
      type: String,
      default: null,
    },
    parentReviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
    },
    resolvedSuggestionIds: [{ type: String }],
    reviewContext: {
      type: String,
      enum: ['personal', 'workspace'],
      default: 'personal',
    },
    managerDecision: {
      type: String,
      enum: ['approved', 'rejected', null],
      default: null,
    },
    managerFeedback: {
      type: String,
      default: null,
    },
    managerDecisionAt: {
      type: Date,
      default: null,
    },
    managerDecisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export const Review = mongoose.model('Review', reviewSchema);
