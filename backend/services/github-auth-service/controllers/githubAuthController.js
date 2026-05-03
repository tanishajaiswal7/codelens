import crypto from 'crypto';
import * as githubAuthService from '../services/githubAuthService.js';
import { authService } from '../../auth-service/services/authService.js';
import { User } from '../../auth-service/models/User.js';

const tokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const githubOAuthStateCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000,
});

const githubOAuthRedirectCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000,
});

const normalizeRedirectPath = (value) => {
  if (!value || typeof value !== 'string') {
    return '/dashboard';
  }

  if (!value.startsWith('/')) {
    return '/dashboard';
  }

  return value;
};

/**
 * Initiates GitHub OAuth flow
 * Generates state token and redirects to GitHub
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const initiateGitHubOAuth = (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const redirect = normalizeRedirectPath(req.query.redirect);
    
    // Store state in cookie (15 min expiry)
    res.cookie('github_oauth_state', state, githubOAuthStateCookieOptions());
    res.cookie('github_oauth_redirect', redirect, githubOAuthRedirectCookieOptions());

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: 'repo read:user',
      state,
    });

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
    res.clearCookie('github_oauth_state', githubOAuthStateCookieOptions());

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Handle OAuth callback
    const { user } = await githubAuthService.handleOAuthCallback(code);

    // Generate JWT token
    const token = authService.generateToken(user._id);

    // Set JWT cookie
    res.cookie('token', token, tokenCookieOptions());

    const redirectPath = normalizeRedirectPath(req.cookies.github_oauth_redirect);
    res.clearCookie('github_oauth_redirect', githubOAuthRedirectCookieOptions());

    // Redirect back to the requested frontend path
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}${redirectPath}`);
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
    const userId = req.userId;

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

    if (!user) {
      return res.json({
        connected: false,
        username: null,
        avatar: null,
        method: null,
      });
    }

    const connected = Boolean(user.githubToken || user.githubId || user.githubUsername);

    if (!connected) {
      return res.json({
        connected: false,
        username: null,
        avatar: null,
        method: null,
      });
    }

    res.json({
      connected: true,
      username: user.githubUsername || null,
      avatar: user.githubAvatar || null,
      method: user.githubToken ? 'oauth' : 'linked',
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
