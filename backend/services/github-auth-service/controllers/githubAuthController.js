import crypto from 'crypto';
import * as githubAuthService from '../services/githubAuthService.js';
import { authService } from '../../auth-service/services/authService.js';
import { User } from '../../auth-service/models/User.js';

const tokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const githubOAuthStateCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000,
});

/**
 * Initiates GitHub OAuth flow
 * Generates state token and redirects to GitHub
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const initiateGitHubOAuth = (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in cookie (15 min expiry)
    res.cookie('github_oauth_state', state, githubOAuthStateCookieOptions());

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: 'repo read:user',
      state,
    });

    // Determine callback URL: prefer explicit env, otherwise derive from request
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/github/auth/callback`;
    if (callbackUrl) {
      params.set('redirect_uri', callbackUrl);
    }

    const redirectUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.redirect(redirectUrl);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('OAuth initiation error:', error.message);
    }
    res.status(500).json({ error: 'Failed to initiate GitHub OAuth' });
  }
};

/**
 * Handles GitHub OAuth callback
 * Exchanges code for token and logs in user
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const handleGitHubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies.github_oauth_state;

    // Validate state parameter (CSRF protection)
    if (!state || state !== storedState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Clear the state cookie
    res.clearCookie('github_oauth_state');

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Handle OAuth callback
    const { user } = await githubAuthService.handleOAuthCallback(code);

    // Generate JWT token
    const token = authService.generateToken(user._id);

    // Set JWT cookie
    res.cookie('token', token, tokenCookieOptions());

    // Redirect to dashboard
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('OAuth callback error:', error.message);
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Validates and stores a Personal Access Token
 * Protected route - requires JWT
 * @param {Object} req - Express request { pat }
 * @param {Object} res - Express response
 */
export const connectPAT = async (req, res) => {
  try {
    const { pat } = req.body;
    const userId = req.user.id;

    if (!pat || typeof pat !== 'string') {
      return res.status(400).json({ error: 'Personal Access Token is required' });
    }

    const result = await githubAuthService.validateAndStorePAT(userId, pat);
    res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('PAT connection error:', error.message);
    }
    res.status(400).json({ error: error.message || 'Failed to validate token' });
  }
};

/**
 * Gets GitHub connection status
 * Protected route - requires JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getStatus = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user from database with GitHub data
    const user = await User.findById(userId);

    if (!user || !user.githubToken) {
      return res.json({
        connected: false,
        username: null,
        avatar: null,
        method: null,
      });
    }

    res.json({
      connected: true,
      username: user.githubUsername,
      avatar: user.githubAvatar,
      method: 'oauth', // In a real app, you'd track which method was used
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Status check error:', error.message);
    }
    res.status(500).json({ error: 'Failed to get connection status' });
  }
};

/**
 * Disconnects GitHub account
 * Protected route - requires JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const disconnect = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await githubAuthService.disconnectGitHub(userId);
    res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Disconnect error:', error.message);
    }
    res.status(500).json({ error: 'Failed to disconnect GitHub account' });
  }
};
