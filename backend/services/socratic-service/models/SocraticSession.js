import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'ai'],
    required: true,
  },
  content: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const socraticSessionSchema = new mongoose.Schema(
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
    originalCode: {
      type: String,
      default: null,
    },
    latestCodeSnapshot: {
      type: String,
      default: null,
    },
    persona: {
      type: String,
      enum: ['faang', 'startup', 'security'],
      required: true,
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    // Optional GitHub context fields
    source: {
      type: String,
      default: 'paste',
    },
    repoFullName: {
      type: String,
      default: null,
    },
    filePath: {
      type: String,
      default: null,
    },
    repoRef: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const SocraticSession = mongoose.model('SocraticSession', socraticSessionSchema);
