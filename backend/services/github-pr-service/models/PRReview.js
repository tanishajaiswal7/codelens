import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
  line: Number,
  suggestion: String,
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
  },
  category: String,
});

const prReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    repoFullName: {
      type: String,
      required: true,
    },
    prNumber: {
      type: Number,
      required: true,
    },
    prTitle: {
      type: String,
      required: true,
    },
    prUrl: {
      type: String,
      required: true,
    },
    selectedFiles: [String],
    persona: {
      type: String,
      default: 'expert',
    },
    suggestions: [
      {
        filename: String,
        suggestions: [suggestionSchema],
      },
    ],
  },
  { timestamps: true }
);

export const PRReview = mongoose.model('PRReview', prReviewSchema);
