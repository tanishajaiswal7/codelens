import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    githubId: {
      type: String,
      default: null,
    },
    githubToken: {
      type: String,
      default: null,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    githubAvatar: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Virtual field to check if GitHub is connected
userSchema.virtual('isGithubConnected').get(function() {
  return this.githubToken !== null;
});

export const User = mongoose.model('User', userSchema);
