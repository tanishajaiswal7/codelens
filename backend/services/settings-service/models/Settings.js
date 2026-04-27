import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark',
    },
    defaultPersona: {
      type: String,
      enum: ['faang', 'startup', 'security'],
      default: 'faang',
    },
    preferredLanguage: {
      type: String,
      default: 'javascript',
    },
    emailNotifications: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly'],
        default: 'daily',
      },
    },
    accountEmail: String,
    language: {
      type: String,
      default: 'en',
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);
