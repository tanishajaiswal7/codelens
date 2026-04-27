import mongoose from 'mongoose';

const workspaceInviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      default: null,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    isReusable: {
      type: Boolean,
      default: false,
    },
    uses: {
      type: Number,
      default: 0,
    },
    maxUses: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Index for fast token lookup
workspaceInviteSchema.index({ token: 1 });

export const WorkspaceInvite = mongoose.model('WorkspaceInvite', workspaceInviteSchema);
