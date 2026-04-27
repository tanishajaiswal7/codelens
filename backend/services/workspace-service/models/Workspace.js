import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    repoUrl: {
      type: String,
      default: null
      // example: "https://github.com/TechCorp/backend-api"
    },
    repoFullName: {
      type: String,
      default: null,
      index: true
      // example: "TechCorp/backend-api"
      // extracted from repoUrl automatically
    },
  },
  { timestamps: true }
);

export const Workspace = mongoose.model('Workspace', workspaceSchema);
