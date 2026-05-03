import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
import { validationResult } from 'express-validator';

const tokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export const authController = {
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await authService.findUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const user = await authService.createUser({ name, email: normalizedEmail, password });
      const token = authService.generateToken(user._id);

      res.cookie('token', token, tokenCookieOptions());

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          onboardingCompleted: user.onboardingCompleted,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const user = await authService.findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.password) {
        return res.status(400).json({
          message: 'This account does not have a local password. Please continue with GitHub login or set a password first.',
        });
      }

      const isPasswordValid = await authService.comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = authService.generateToken(user._id);

      res.cookie('token', token, tokenCookieOptions());

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          onboardingCompleted: user.onboardingCompleted,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res) {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  },

  async getMe(req, res, next) {
    try {
      const user = await authService.findUserById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          onboardingCompleted: user.onboardingCompleted,
          githubUsername: user.githubUsername,
          githubAvatar: user.githubAvatar,
          githubId: user.githubId,
          avatarUrl: user.avatarUrl,
          isGithubConnected: user.isGithubConnected,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async completeOnboarding(req, res, next) {
    try {
      const user = await authService.completeOnboarding(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email } = req.body;
      const updateData = {};

      // Get current user to check GitHub status
      const currentUser = await authService.findUserById(req.userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (email !== undefined) {
        // Prevent email change for GitHub-logged-in users
        if (currentUser.githubId) {
          return res.status(400).json({ 
            message: 'Email cannot be changed for GitHub-connected accounts. Please disconnect GitHub first.' 
          });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await authService.findUserByEmail(normalizedEmail);

        if (existingUser && String(existingUser._id) !== String(req.userId)) {
          return res.status(400).json({ message: 'Email already registered' });
        }

        updateData.email = normalizedEmail;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No profile fields provided' });
      }

      const user = await authService.updateUserProfile(req.userId, updateData);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Avatar image is required' });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await authService.updateUserAvatar(req.userId, avatarUrl);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Avatar updated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const email = req.body.email.trim().toLowerCase();
      const resetResult = await authService.createPasswordResetToken(email);

      const baseResponse = {
        message: 'If an account exists for this email, a reset link has been generated.',
      };

      if (!resetResult) {
        return res.json(baseResponse);
      }

      const { token, user } = resetResult;
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendBaseUrl}/reset-password/${token}`;

      const isProduction = process.env.NODE_ENV === 'production';

      if (emailService.isConfigured()) {
        try {
          await emailService.sendPasswordResetEmail({
            toEmail: user.email,
            userName: user.name,
            resetUrl,
          });
        } catch (sendError) {
          await authService.clearPasswordResetToken(user._id);

          if (isProduction) {
            return res.status(500).json({
              message: 'Unable to send reset email right now. Please try again later.',
            });
          }
        }
      } else if (isProduction) {
        await authService.clearPasswordResetToken(user._id);
        return res.status(500).json({
          message: 'Password reset email service is not configured.',
        });
      }

      if (!isProduction) {
        return res.json({
          ...baseResponse,
          resetToken: token,
          resetUrl,
        });
      }

      return res.json(baseResponse);
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token } = req.params;
      const { password } = req.body;

      const user = await authService.findUserByValidResetToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Reset token is invalid or expired' });
      }

      await authService.updatePasswordFromReset(user, password);

      return res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (error) {
      next(error);
    }
  },
};
