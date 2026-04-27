/*
 GITHUB OAUTH APP SETUP (do this before running the server):

 1. Go to https://github.com/settings/developers
 2. Click "New OAuth App"
 3. Fill in:
    Application name: CodeLens AI (Local)
    Homepage URL: http://localhost:5173
    Authorization callback URL: http://localhost:5000/api/github/auth/callback
 4. Click "Register application"
 5. Copy the Client ID → paste as GITHUB_CLIENT_ID in .env
 6. Click "Generate a new client secret" → paste as GITHUB_CLIENT_SECRET in .env
 7. For production: create a second OAuth App with your real domain URLs

 PAT SCOPES TO TELL USERS:
 - repo (read private repos, PRs, and files)
 - read:user (fetch their GitHub username and avatar)
*/

import express from 'express';
import { verifyToken } from '../../../middleware/authMiddleware.js';
import * as githubAuthController from '../controllers/githubAuthController.js';

const router = express.Router();

/**
 * GET /api/github/auth/login
 * Initiates GitHub OAuth flow
 * Public - no auth required
 */
router.get('/login', githubAuthController.initiateGitHubOAuth);

/**
 * GET /api/github/auth/callback
 * GitHub OAuth callback endpoint
 * Public - GitHub redirects here with code
 */
router.get('/callback', githubAuthController.handleGitHubCallback);

/**
 * POST /api/github/auth/connect-pat
 * Validates and stores Personal Access Token
 * Protected - requires JWT
 */
router.post('/connect-pat', verifyToken, githubAuthController.connectPAT);

/**
 * GET /api/github/auth/status
 * Gets GitHub connection status
 * Protected - requires JWT
 */
router.get('/status', verifyToken, githubAuthController.getStatus);

/**
 * DELETE /api/github/auth/disconnect
 * Disconnects GitHub account
 * Protected - requires JWT
 */
router.delete('/disconnect', verifyToken, githubAuthController.disconnect);

export default router;
