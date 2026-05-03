import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { User } from '../models/User.js';

/**
 * Authentication service
 * Handles user registration, login, and token generation
 */
export const authService = {
  /**
   * Find a user by email address
   * @param {string} email - User email to search for
   * @returns {Promise<Object|null>} User document or null if not found
   */
  async findUserByEmail(email) {
    return await User.findOne({ email });
  },

  /**
   * Create a new user with hashed password
   * @param {Object} userData - User data {name, email, password}
   * @returns {Promise<Object>} Created user document
   */
  async createUser(userData) {
    const { name, email, password } = userData;

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();
    return user;
  },

  /**
   * Compare plain password with hashed password
   * @param {string} plainPassword - Plain text password from user input
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePasswords(plainPassword, hashedPassword) {
    return await bcryptjs.compare(plainPassword, hashedPassword);
  },

  /**
   * Generate JWT token for authenticated user
   * @param {string} userId - User ID to encode in token
   * @returns {string} Signed JWT token
   */
  generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });
  },

  /**
   * Find user by ID, excluding password field
   * @param {string} userId - User ID to search for
   * @returns {Promise<Object|null>} User document without password
   */
  async findUserById(userId) {
    return await User.findById(userId).select('-password');
  },

  /**
   * Update authenticated user's profile fields.
   * @param {string} userId - User ID to update
   * @param {Object} updates - Updatable fields
   * @param {string} [updates.name] - Display name
   * @param {string} [updates.email] - Login email
   * @returns {Promise<Object|null>} Updated user document without password
   */
  async updateUserProfile(userId, updates) {
    return await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
  },

  /**
   * Create and persist a password reset token.
   * @param {string} email - User email
   * @returns {Promise<{token: string, user: Object}|null>} Token and user, or null when user does not exist
   */
  async createPasswordResetToken(email) {
    const user = await User.findOne({ email });
    if (!user) {
      return null;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    return { token, user };
  },

  /**
   * Find a user by reset token if token is valid and not expired.
   * @param {string} token - Plain reset token from user link
   * @returns {Promise<Object|null>} User document or null
   */
  async findUserByValidResetToken(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });
  },

  /**
   * Update user's password and clear reset token fields.
   * @param {Object} user - User document
   * @param {string} newPassword - New plain text password
   * @returns {Promise<void>}
   */
  async updatePasswordFromReset(user, newPassword) {
    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
  },

  /**
   * Clear reset token fields for a user.
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async clearPasswordResetToken(userId) {
    await User.findByIdAndUpdate(userId, {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  },

  /**
   * Update user's avatar and remove the old uploaded avatar if present.
   * @param {string} userId - User ID
   * @param {string} avatarUrl - New avatar URL
   * @returns {Promise<Object|null>} Updated user document without password
   */
  async updateUserAvatar(userId, avatarUrl) {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    const oldAvatarUrl = user.avatarUrl;
    user.avatarUrl = avatarUrl;
    await user.save();

    if (oldAvatarUrl && oldAvatarUrl.startsWith('/uploads/avatars/')) {
      const oldFilePath = path.resolve(process.cwd(), 'uploads', oldAvatarUrl.replace('/uploads/', ''));
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        // Ignore missing old files; the new avatar has already been saved.
      }
    }

    return await User.findById(userId).select('-password');
  },

  /**
   * Mark onboarding as completed for a user.
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated user document without password
   */
  async completeOnboarding(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { onboardingCompleted: true },
      { new: true }
    ).select('-password');
  },
};
